import json
import os
from pathlib import Path

import pyarrow.parquet as pq
import typer
from boto3.session import Session
from cardpay_reward_programs.rules import *
from cloudpathlib import S3Client
from dotenv import load_dotenv

from .payment_tree import PaymentTree
from .utils import get_parameters, to_camel_case

load_dotenv()

cached_client = S3Client(
    local_cache_dir="mycache",
    boto3_session=Session(
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    ),
)
cached_client.set_as_default_client()


def select_rule(name, core_parameters, user_defined_parameters):
    rule_constructor = globals()[name]
    instance = rule_constructor(core_parameters, user_defined_parameters)
    return instance


def blob_to_rule(parameters):
    core_parameters, user_defined_parameters = get_parameters(parameters)
    name = to_camel_case(core_parameters["docker_image"])
    return select_rule(name, core_parameters, user_defined_parameters)


def run_reward_program(
    reward_program_id: str,
    parameters_file: str = typer.Option(
        default="./input/parameters.json", help="The parameters file to use"
    ),
    output_location: str = typer.Option(
        default="./output", help="The directory to write the results to"
    ),
):
    """
    Run a reward program as defined in the parameters file
    """
    parameters = json.load(open(parameters_file))

    # TODO: query smart contract for blob
    # TODO: the logic to select the payment cycle can be surfaced here
    # TODO: write s3 rule config

    rule = blob_to_rule(parameters)
    start_block = rule.start_block
    end_block = rule.end_block
    results_df = rule.run(start_block, end_block)
    payment_list = rule.df_to_payment_list(results_df, reward_program_id)
    tree = PaymentTree(payment_list.to_dict("records"))
    table = tree.as_arrow()
    pq.write_table(table, Path(output_location) / "results.parquet")


def cli():
    typer.run(run_reward_program)


if __name__ == "__main__":
    typer.run(run_reward_program)
