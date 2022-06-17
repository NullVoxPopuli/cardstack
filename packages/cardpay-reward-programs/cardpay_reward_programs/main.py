import json
import os

import sentry_sdk
import typer
from boto3.session import Session
from cardpay_reward_programs.rule import Rule
from cardpay_reward_programs.rules import *
from cloudpathlib import AnyPath, S3Client
from dotenv import load_dotenv

from .payment_tree import PaymentTree
from .utils import write_parquet_file
from .utils import get_parameters_file_path

load_dotenv()

cached_client = S3Client(
    local_cache_dir=".cache",
    boto3_session=Session(),
)
cached_client.set_as_default_client()


SENTRY_DSN = os.environ.get("SENTRY_DSN")
if SENTRY_DSN is not None:
    for expected_env in ["ENVIRONMENT"]:
        if expected_env not in os.environ:
            raise ValueError(f"Missing environment variable {expected_env}")
    sentry_sdk.init(
        SENTRY_DSN,
        # Set traces_sample_rate to 1.0 to capture 100%
        # of transactions for performance monitoring.
        # We recommend adjusting this value in production.
        traces_sample_rate=1.0,
        environment=os.environ.get("ENVIRONMENT"),
    )


def run_reward_program(
    # parameters_file: str = typer.Argument(
    #     default="./input/safe_ownership/parameters.json", help="The parameters file to use"
    # ),
    output_location: str = typer.Argument(
        default="./output", help="The directory to write the results to"
    ),
    rule_name: str = typer.Argument(default=os.getenv("RULE"), help="Rule name"),
):
    """
    Run a reward program as defined in the parameters file
    """
    parameters_file = get_parameters_file_path(rule_name)

    with open(AnyPath(parameters_file), "r") as stream:
        parameters = json.load(stream)
    for subclass in Rule.__subclasses__():
        if subclass.__name__ == rule_name:
            rule = subclass(parameters["core"], parameters["user_defined"])
    payment_list = rule.run(
        parameters["run"]["payment_cycle"], parameters["run"]["reward_program_id"]
    )
    tree = PaymentTree(payment_list.to_dict("records"))
    table = tree.as_arrow()
    write_parquet_file(AnyPath(output_location), table)


if __name__ == "__main__":
    typer.run(run_reward_program)

