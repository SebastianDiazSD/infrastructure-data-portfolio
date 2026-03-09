"""
app.py
Railway Project Cost Deviation Dashboard
Run with: streamlit run app.py
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

from analysis import (
    load_data,
    portfolio_summary,
    project_summary,
    work_package_breakdown,
    deviation_by_work_package_type,
)

# ── Page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Railway Cost Deviation Tracker",
    page_icon="🚆",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Custom CSS ────────────────────────────────────────────────────────────────
st.markdown("""
<style>
    .metric-card {
        background: #f8f9fa;
        border-left: 4px solid #e63946;
        padding: 1rem 1.2rem;
        border-radius: 6px;
        margin-bottom: 0.5rem;
    }
    .metric-label { font-size: 0.78rem; color: #6c757d; text-transform: uppercase; letter-spacing: 0.05em; }
    .metric-value { font-size: 1.6rem; font-weight: 700; color: #212529; }
    .metric-delta-bad  { font-size: 0.85rem; color: #e63946; }
    .metric-delta-ok   { font-size: 0.85rem; color: #2a9d8f; }
    .section-header { font-size: 1.1rem; font-weight: 600; color: #343a40;
                      border-bottom: 2px solid #e63946; padding-bottom: 4px;
                      margin: 1.5rem 0 1rem 0; }
</style>
""", unsafe_allow_html=True)

# ── Load data ─────────────────────────────────────────────────────────────────
@st.cache_data
def get_data():
    return load_data()

df = get_data()
kpis = portfolio_summary(df)
proj_df = project_summary(df)

# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.image("https://img.icons8.com/fluency/96/train.png", width=60)
    st.title("Cost Deviation\nTracker")
    st.caption("Railway Infrastructure Portfolio")
    st.divider()

    view = st.radio("View", ["📊 Portfolio Overview", "🔍 Project Drilldown"], index=0)

    st.divider()
    risk_filter = st.multiselect(
        "Filter by Risk Level",
        options=["High", "Medium", "Low"],
        default=["High", "Medium", "Low"],
    )
    df_filtered = df[df["risk_level"].isin(risk_filter)]

    st.divider()
    st.caption("Data: anonymised, inspired by Deutsche Bahn infrastructure programmes.")
    st.caption("Built by [Sebastian Arce Diaz](https://www.linkedin.com/in/sebastian-arce-diaz91/)")

# ── Portfolio Overview ────────────────────────────────────────────────────────
if view == "📊 Portfolio Overview":

    st.title("🚆 Railway Infrastructure — Cost Deviation Dashboard")
    st.caption(f"Portfolio: {kpis['n_projects']} active projects · Data as of March 2026")

    # KPI row
    c1, c2, c3, c4, c5 = st.columns(5)

    with c1:
        st.metric("Total Budget", f"€{kpis['total_budget_m']}M")
    with c2:
        st.metric("Actual Cost", f"€{kpis['total_actual_m']}M",
                  delta=f"+€{kpis['total_dev_m']}M", delta_color="inverse")
    with c3:
        st.metric("Portfolio Overrun", f"{kpis['total_dev_pct']}%",
                  delta="vs budget", delta_color="inverse")
    with c4:
        st.metric("High-Risk Work Packages", kpis["high_risk_count"],
                  delta=f"{kpis['medium_risk_count']} medium risk", delta_color="off")
    with c5:
        st.metric("Avg. Progress", f"{kpis['avg_progress_pct']}%")

    st.divider()

    # ── Row 1: Budget vs Actual bar + Deviation % bar ────────────────────────
    col1, col2 = st.columns(2)

    with col1:
        st.markdown('<p class="section-header">Budget vs Actual Cost by Project (€M)</p>', unsafe_allow_html=True)
        fig_bar = go.Figure()
        fig_bar.add_trace(go.Bar(
            name="Budget",
            x=proj_df["project_name"].str[:30],
            y=proj_df["budget_m"],
            marker_color="#457b9d",
        ))
        fig_bar.add_trace(go.Bar(
            name="Actual",
            x=proj_df["project_name"].str[:30],
            y=proj_df["actual_m"],
            marker_color="#e63946",
        ))
        fig_bar.update_layout(
            barmode="group", height=360,
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
            margin=dict(l=0, r=0, t=10, b=80),
            xaxis_tickangle=-25,
            yaxis_title="€ Million",
        )
        st.plotly_chart(fig_bar, use_container_width=True)

    with col2:
        st.markdown('<p class="section-header">Cost Deviation % by Project</p>', unsafe_allow_html=True)
        colours = ["#e63946" if v > 10 else "#f4a261" if v > 5 else "#2a9d8f"
                   for v in proj_df["deviation_pct"]]
        fig_dev = go.Figure(go.Bar(
            x=proj_df["deviation_pct"],
            y=proj_df["project_name"].str[:30],
            orientation="h",
            marker_color=colours,
            text=[f"+{v}%" for v in proj_df["deviation_pct"]],
            textposition="outside",
        ))
        fig_dev.add_vline(x=10, line_dash="dash", line_color="#e63946",
                          annotation_text="10% threshold", annotation_position="top right")
        fig_dev.update_layout(
            height=360,
            margin=dict(l=0, r=60, t=10, b=20),
            xaxis_title="Deviation (%)",
        )
        st.plotly_chart(fig_dev, use_container_width=True)

    # ── Row 2: Progress + Risk distribution ─────────────────────────────────
    col3, col4 = st.columns(2)

    with col3:
        st.markdown('<p class="section-header">Construction Progress by Project (%)</p>', unsafe_allow_html=True)
        fig_prog = px.bar(
            proj_df.sort_values("avg_progress"),
            x="avg_progress", y="project_name",
            orientation="h",
            color="avg_progress",
            color_continuous_scale=["#e63946", "#f4a261", "#2a9d8f"],
            range_color=[0, 100],
            text="avg_progress",
        )
        fig_prog.update_traces(texttemplate="%{text:.1f}%", textposition="outside")
        fig_prog.update_layout(
            height=320, showlegend=False,
            coloraxis_showscale=False,
            margin=dict(l=0, r=60, t=10, b=20),
            xaxis_title="Avg. Progress (%)", xaxis_range=[0, 110],
        )
        st.plotly_chart(fig_prog, use_container_width=True)

    with col4:
        st.markdown('<p class="section-header">Risk Distribution — Work Packages</p>', unsafe_allow_html=True)
        risk_counts = df_filtered["risk_level"].value_counts().reset_index()
        risk_counts.columns = ["risk_level", "count"]
        colour_map = {"High": "#e63946", "Medium": "#f4a261", "Low": "#2a9d8f"}
        fig_pie = px.pie(
            risk_counts, names="risk_level", values="count",
            color="risk_level", color_discrete_map=colour_map,
            hole=0.45,
        )
        fig_pie.update_traces(textinfo="percent+label")
        fig_pie.update_layout(height=320, margin=dict(l=0, r=0, t=10, b=0), showlegend=False)
        st.plotly_chart(fig_pie, use_container_width=True)

    # ── Row 3: Deviation by work package type ────────────────────────────────
    st.markdown('<p class="section-header">Average Deviation % by Work Package Type</p>', unsafe_allow_html=True)
    wp_dev = deviation_by_work_package_type(df_filtered)
    colours_wp = ["#e63946" if v > 10 else "#f4a261" if v > 5 else "#2a9d8f"
                  for v in wp_dev["avg_deviation_pct"]]
    fig_wp = go.Figure(go.Bar(
        x=wp_dev["work_package"],
        y=wp_dev["avg_deviation_pct"],
        marker_color=colours_wp,
        text=[f"{v}%" for v in wp_dev["avg_deviation_pct"]],
        textposition="outside",
    ))
    fig_wp.add_hline(y=10, line_dash="dash", line_color="#e63946")
    fig_wp.update_layout(
        height=300,
        margin=dict(l=0, r=0, t=10, b=20),
        yaxis_title="Avg. Deviation (%)",
        yaxis_range=[0, max(wp_dev["avg_deviation_pct"]) * 1.25],
    )
    st.plotly_chart(fig_wp, use_container_width=True)

    # ── Full data table ───────────────────────────────────────────────────────
    with st.expander("📋 View raw data table"):
        st.dataframe(
            df_filtered[[
                "project_name", "work_package", "budget_eur",
                "actual_cost_eur", "deviation_eur", "deviation_pct",
                "progress_pct", "risk_level"
            ]].style.format({
                "budget_eur": "€{:,.0f}",
                "actual_cost_eur": "€{:,.0f}",
                "deviation_eur": "€{:,.0f}",
                "deviation_pct": "{:.1f}%",
                "progress_pct": "{:.1f}%",
            }).applymap(
                lambda v: "color: #e63946; font-weight: bold" if v == "High"
                else "color: #f4a261" if v == "Medium" else "color: #2a9d8f",
                subset=["risk_level"]
            ),
            use_container_width=True,
            height=400,
        )

# ── Project Drilldown ─────────────────────────────────────────────────────────
else:
    st.title("🔍 Project Drilldown")

    project_options = dict(zip(proj_df["project_name"], proj_df["project_id"]))
    selected_name = st.selectbox("Select a project", options=list(project_options.keys()))
    selected_id = project_options[selected_name]

    proj_row = proj_df[proj_df["project_id"] == selected_id].iloc[0]
    wp_df = work_package_breakdown(df, selected_id)

    # Project KPIs
    k1, k2, k3, k4 = st.columns(4)
    k1.metric("Budget", f"€{proj_row['budget_m']}M")
    k2.metric("Actual Cost", f"€{proj_row['actual_m']}M",
              delta=f"+€{proj_row['deviation_m']}M", delta_color="inverse")
    k3.metric("Deviation", f"{proj_row['deviation_pct']}%", delta_color="inverse")
    k4.metric("Avg. Progress", f"{proj_row['avg_progress']:.1f}%")

    st.divider()

    col1, col2 = st.columns(2)

    with col1:
        st.markdown('<p class="section-header">Budget vs Actual by Work Package</p>', unsafe_allow_html=True)
        fig_wp_bar = go.Figure()
        fig_wp_bar.add_trace(go.Bar(name="Budget", x=wp_df["work_package"],
                                    y=wp_df["budget_eur"] / 1e6, marker_color="#457b9d"))
        fig_wp_bar.add_trace(go.Bar(name="Actual", x=wp_df["work_package"],
                                    y=wp_df["actual_cost_eur"] / 1e6, marker_color="#e63946"))
        fig_wp_bar.update_layout(
            barmode="group", height=340, yaxis_title="€ Million",
            margin=dict(l=0, r=0, t=10, b=20),
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        )
        st.plotly_chart(fig_wp_bar, use_container_width=True)

    with col2:
        st.markdown('<p class="section-header">Deviation % & Risk per Work Package</p>', unsafe_allow_html=True)
        risk_colours = [{"High": "#e63946", "Medium": "#f4a261", "Low": "#2a9d8f"}[r]
                        for r in wp_df["risk_level"]]
        fig_wp_dev = go.Figure(go.Bar(
            x=wp_df["deviation_pct"],
            y=wp_df["work_package"],
            orientation="h",
            marker_color=risk_colours,
            text=[f"{v}%  [{r}]" for v, r in zip(wp_df["deviation_pct"], wp_df["risk_level"])],
            textposition="outside",
        ))
        fig_wp_dev.add_vline(x=10, line_dash="dash", line_color="#e63946")
        fig_wp_dev.update_layout(
            height=340,
            margin=dict(l=0, r=120, t=10, b=20),
            xaxis_title="Deviation (%)",
        )
        st.plotly_chart(fig_wp_dev, use_container_width=True)

    # Progress bars
    st.markdown('<p class="section-header">Construction Progress by Work Package</p>', unsafe_allow_html=True)
    for _, row in wp_df.iterrows():
        col_a, col_b = st.columns([1, 3])
        col_a.write(f"**{row['work_package']}**")
        col_b.progress(int(row["progress_pct"]),
                       text=f"{row['progress_pct']}% complete")