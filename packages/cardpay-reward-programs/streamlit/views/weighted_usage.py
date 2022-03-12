import altair as alt
import pandas as pd
import streamlit as st
from cardpay_reward_programs.rules import WeightedUsage

from .utils import read_core_config, slider_partition


def weighted_usage(core_parameters):
    s = st.expander(label="User defined parameters", expanded=True)
    base_reward = s.number_input("Base reward", value=5, step=1, min_value=0, max_value=100)
    transaction_factor = s.number_input(
        "Transaction factor", value=2.0, step=0.1, min_value=0.0, max_value=10.0
    )
    spend_factor = s.number_input(
        "Spend factor", value=2.0, step=0.1, min_value=0.0, max_value=10.0
    )

    user_defined_parameters = {
        "base_reward": base_reward,
        "transaction_factor": transaction_factor,
        "spend_factor": spend_factor,
        "token": "0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E",
        "subgraph_config_location": {
            "prepaid_card_payment": "s3://cardpay-staging-partitioned-graph-data//data/prepaid_card_payments/0.0.3/"
        },
        "duration": 43200,
    }
    rule = WeightedUsage(core_parameters, user_defined_parameters)
    read_core_config(rule)
    return rule


def view_multiple(core_parameters):
    program = weighted_usage(core_parameters)
    start_block, end_block = slider_partition(type="two_end")
    progress = st.progress(0.0)
    payments = []
    cached_df = []
    for i in range(start_block, end_block, program.payment_cycle_length):
        progress.progress((i - start_block) / (end_block - start_block))
        tail = min(end_block, i + program.payment_cycle_length)
        df = program.run(tail)
        payments.append({"block": i, "amount": df["amount"].sum()})
        if not df.empty:
            cached_df.append(df)

    df = program.aggregate(cached_df)
    payment_list = program.df_to_payment_list(df, end_block)
    multiple_df = pd.DataFrame(payments)
    amount_each_cycle = (
        alt.Chart(multiple_df)
        .mark_bar()
        .encode(
            alt.X("block"),
            y="amount",
        )
    )

    st.altair_chart(amount_each_cycle, use_container_width=True)
    amounts = (
        alt.Chart(multiple_df)
        .mark_bar()
        .encode(
            alt.X("amount:Q", bin=alt.Bin()),
            y="count()",
        )
    )

    st.altair_chart(amounts, use_container_width=True)
    return payment_list, df, program.get_summary(payment_list)


def view_single(core_parameters):
    program = weighted_usage(core_parameters)
    block = slider_partition(type="one_end")
    df = program.run(block)
    payment_list = program.df_to_payment_list(df, block)

    altair_chart = (
        alt.Chart(df)
        .mark_bar()
        .encode(
            alt.X("amount:Q", bin=alt.Bin()),
            y="count()",
        )
    )

    st.altair_chart(altair_chart, use_container_width=True)
    return payment_list, df, program.get_summary(payment_list)
