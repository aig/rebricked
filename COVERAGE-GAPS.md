# rebricked — Coverage Gap Report

**What was compared:** the project's data file (`databricks.json`, 71 curated entries — renames, deprecations, and notable features, plus 106 aliases) against the full Databricks product release notes in `reference/` (103 monthly files, Apr 2018 - Jul 2026).

**Method:** five agents extracted every distinct named product/service/feature from the release notes (~600 raw mentions), deduped to distinct concepts (earliest mention kept), then diffed against every name and alias the project already covers. Nothing was dropped for being minor — per your instruction, this is the whole list.

**Headline:** the project catalogs ~50 distinct product concepts. The release notes name **300+ distinct products/features that the project does not cover.** This is expected — `rebricked` is a *curated* timeline of renames/deprecations/marquee features, not an exhaustive catalog — but here is the complete gap list, grouped so it stays usable.

> Legend: dates are first appearance in the release notes. Items marked **[adjacent]** are sub-features of something the project *does* cover (e.g. a Genie sub-feature) — listed because they are separately named, but they extend a covered entry rather than being wholly absent.

---

## Already covered (excluded from the gap list below)

For reference, the project already covers these ~50 concepts (with their rename/deprecation history): Delta Lake, Delta Live Tables / Lakeflow Declarative Pipelines / Spark Declarative Pipelines, Workflows / Lakeflow Jobs, SQL Warehouse (ex SQL Endpoint), Databricks Repos / Git folders, Data Explorer / Catalog Explorer, Lakeview / AI/BI Dashboards, Databricks Asset Bundles / Declarative Automation Bundles, Genie Spaces / Genie Agents / Genie / Databricks One / Genie One, Databricks Assistant / Genie Code, Vector Search / Mosaic AI Vector Search / Databricks AI Search, SQL Analytics / Databricks SQL, Agent Bricks Multi-Agent Supervisor / Supervisor Agent, Model Serving (ex Serverless Real-Time Inference), Workspace Model Registry, Workspace Feature Store, Feature Engineering in UC, Liquid Clustering, Unity Catalog + UC Volumes + UC managed Iceberg tables + Models in UC, Lakehouse Federation, Databricks/Simba ODBC Driver, Delta Sharing / OpenSharing, Lakeflow Pipelines Editor (ex multi-file editor), Lakeflow Designer, Hive metastore (dep), Lakebase, Lakehouse Real-Time, ABAC, Serverless workspaces, Standard/Dedicated access modes, Personal access tokens (legacy), OAuth token federation, Databricks Clean Rooms, Databricks CLI (v0.205+) / Legacy CLI, Databricks Connect, New/Legacy SQL editor, new/legacy SQL alerts, dbx (dep), Legacy dashboards (dep), DBFS mounts (dep), Init scripts on DBFS (dep), No-isolation shared access mode (dep).

---

## 1. Compute & clusters

| First seen | Product / Feature |
|---|---|
| 2018-02 | Serverless pools / High Concurrency clusters (cluster mode) |
| 2018-05 | GPU-enabled clusters (P3, later G4/G5 instances) |
| 2018-05 | Cluster pinning |
| 2018-05 | Cluster autostart |
| 2018-08 | Cluster-scoped init scripts |
| 2019-07 | Instance pools |
| 2019-08 | Long Term Support (LTS) runtimes |
| 2019-11 | Databricks Container Services (custom Docker images) |
| 2020-01 | Cluster autoscaling (standard) |
| 2020-06 | Cluster policies |
| 2020-07 | Web terminal |
| 2020-07 | Global init scripts (new framework) |
| 2020-09 | Single Node clusters |
| 2020-12 | Auto-AZ (automatic availability-zone selection) |
| 2021-01 | Preloaded Docker images in instance pools |
| 2021-04 | Databricks Runtime Extended Support |
| 2021-08 | Serverless compute (Databricks-plane compute) |
| 2021-08 | AWS EBS gp3 volumes |
| 2022-03 | Enhanced autoscaling (streaming-aware, for pipelines) |
| 2022-09 | AWS Graviton instance support |
| 2022-10 | Personal Compute cluster policy |
| 2023-05 | Automatic cluster update |
| 2023-05 | AWS Fleet instance types |
| 2023-04 | Cluster metrics UI (replaces Ganglia) |
| 2024-02 | Automatic cluster update (host OS/security image) |
| 2025-06 | Serverless GPU compute / AI Runtime |
| 2025-08 | Base environments (serverless custom cached env specs) |
| 2025-10 | AWS Capacity Blocks |
| 2025-12 | Flexible node types (instance-type fallback) |
| 2026-03 | AI Runtime (GPU serverless, Public Preview) |
| 2026-05 | Databricks Container Services for standard compute |
| 2026-06 | AI Runtime CLI (`air`) |

## 2. Data ingestion — Auto Loader, Lakeflow Connect & connectors

| First seen | Product / Feature |
|---|---|
| 2020-02 | Auto Loader |
| 2020-02 | COPY INTO |
| 2020-02 | Data Ingestion Network / Partner Integrations gallery |
| 2024-02 | File arrival triggers |
| 2024-07 | Lakeflow Connect (managed ingestion connectors framework) |
| 2025-05 | File events for external locations |
| 2025-10 | Zerobus Ingest connector (gRPC record-by-record) |
| 2026-04 | Query-based connectors (cursor-column, no CDC/gateway) |
| 2026-05 | Community connectors (open-source Lakeflow Connect) |
| 2026-07 | MySQL integrated CDC pipeline (gateway-free) |

**Lakeflow Connect / ingestion source connectors** (each separately named): Salesforce (2024-07), SQL Server (2024-07), Workday RaaS (2024-07), Amazon RDS (2024-07), ServiceNow (2025-03), Google Analytics raw (2025-04), Workday Reports (2025-04), Microsoft SharePoint (2025-06), Salesforce Data Cloud File Sharing (2025-06), Microsoft SQL Server (2025-08), SFTP (2025-11), MySQL (2025-12), Meta Ads (2025-12), Confluence (2025-12), PostgreSQL (2025-12), NetSuite (2025-12), Jira (2025-12), Microsoft Dynamics 365 (2025-12), Google Drive (2026-01), TikTok Ads (2026-02), HubSpot (2026-02), Google Ads (2026-02), Outlook (2026-05), GitHub (2026-05), Smartsheet (2026-05), Anthropic Compliance API (2026-07), Veeva Vault (2026-07), Strac (2026-07), Zip (2026-06), Monday.com (2026-06), Zoho Books (2026-06), Aha! (2026-06), Square (2026-06), Wiz Audit Logs (2026-06), Netskope Logs (2026-06), Salesforce Marketing Cloud (2026-06), RabbitMQ (2026-06), Zoom Logs (2026-06), Pendo (2026-06), Slack Access/Integration Logs (2026-06).

## 3. Data engineering — pipelines & streaming (DLT-adjacent)

| First seen | Product / Feature |
|---|---|
| 2022-02 | DLT change data capture (AUTO CDC / APPLY CHANGES) **[adjacent]** |
| 2022-03 | DLT channel setting (preview/current) **[adjacent]** |
| 2022-08 | DLT generated columns **[adjacent]** |
| 2023-02 | Continuous jobs |
| 2023-02 | File arrival trigger (jobs) |
| 2025-02 | DLT sinks (Kafka / Event Hubs) **[adjacent]** |
| 2025-07 | Real-time mode in Structured Streaming |
| 2025-12 | ForEachBatch for Spark Declarative Pipelines **[adjacent]** |
| 2026-05 | Standalone pipelines (serverless general compute, ex "DBSQL pipelines") |
| 2020-02 | Structured Streaming state store reader |
| 2024-12 | Streaming workload / backlog metrics |
| 2023-02 | Ray on Databricks (Ray on Spark) |
| 2023-03 | TorchDistributor |

## 4. Delta Lake / table-format features

| First seen | Product / Feature |
|---|---|
| 2019-04 | Delta Lake time travel |
| 2019-06 | Delta Lake Auto Optimize |
| 2019-10 | Dynamic File Pruning (DFP) |
| 2019-10 | Python APIs for Delta tables |
| 2020-05 | CONVERT TO DELTA |
| 2020-05 | Automatic schema evolution for MERGE |
| 2020-08 | Delta table CLONE (shallow/deep) |
| 2022-09 | Disk cache (formerly Delta cache) |
| 2023-06 | Delta Lake column mapping (rename/drop columns) |
| 2023-10 | Deletion vectors (merge-on-read deletes) |
| 2023-10 | Predictive I/O for updates |
| 2023-10 | UNDROP TABLE |
| 2023-09/10 | Predictive optimization (auto OPTIMIZE/clustering for UC managed tables) |
| 2026-03 | Type widening |
| 2026-03 | Multi-table transactions (BEGIN ATOMIC...END) |
| 2026-06 | Parquet v2 encodings for Delta |
| 2026-06 | Auto time-to-live (auto-TTL) for managed tables |
| 2025-06 | Convert external to managed table (ALTER TABLE SET MANAGED) |

## 5. Apache Iceberg & open table formats

| First seen | Product / Feature |
|---|---|
| 2024-09 | EXTERNAL USE SCHEMA privilege (external Iceberg/Fabric access) |
| 2025-06 | Foreign Apache Iceberg tables (via federation) |
| 2025-12 | Delta Sharing to external Iceberg clients (Snowflake/Trino/Flink) |
| 2026-05 | Apache Iceberg v3 features (deletion vectors, VARIANT, row lineage) |
| 2026-05 | Catalog commits (UC as system of coordination for managed tables) |
| 2026-07 | Managed Iceberg materialized views |
| 2024-02 | Cloudflare R2 storage support (UC) |

## 6. Unity Catalog — governance & metadata

| First seen | Product / Feature |
|---|---|
| 2022-09 | Unity Catalog data lineage (column/table) |
| 2022-10 | UC privilege inheritance |
| 2022-11 | UC managed-table storage locations (catalog/schema level) |
| 2023-05 | Workspace-catalog binding |
| 2023-08 | Unity Catalog tags |
| 2023-08 | Unity Catalog allowlist (init scripts/JARs on shared clusters) |
| 2023-09 | Row filters and column masks |
| 2023-10 | Semantic search over UC |
| 2023-10 | AI-generated table/column comments |
| 2023-12 | Databricks Online Tables |
| 2024-03 | BROWSE privilege |
| 2024-06 | AI-generated comments (GA path) |
| 2024-06 | Databricks Geos (data residency) |
| 2024-08 | Resource Quotas APIs |
| 2024-11 | Service credentials (UC-governed IAM auth) |
| 2024-12 | MANAGE privilege |
| 2024-12 | Hive metastore federation (UC over HMS/Glue) |
| 2025-05 | Unity Catalog metric views |
| 2025-06 | External lineage (Bring Your Own Lineage) |
| 2025-06 | Tag policies / governed tags |
| 2025-08 | Access requests (self-service) |
| 2025-08 | Path credential vending |
| 2025-09 | Data classification system table |
| 2025-10 | Data Classification (auto-classify/tag sensitive data) |
| 2025-10 | Certification status system tag |
| 2026-02 | Discover page and business domains |
| 2026-03 | Customer-managed keys for Unity Catalog |
| 2026-03 | BI compatibility mode for metric views |
| 2026-06 | Model services (UC securable for governed LLM endpoints) |
| 2026-07 | Scala/Java UDFs in Unity Catalog |
| 2026-07 | Secrets in Unity Catalog |
| 2023-12 | Entity Relationship Diagram (ERD) in Catalog Explorer |
| 2023-03 | Table Insights tab (Catalog Explorer) |

## 7. Databricks SQL, warehouses & BI

| First seen | Product / Feature |
|---|---|
| 2021-06 | Cloud Fetch (parallel BI data fetch) |
| 2022-01 | Databricks Photon (vectorized query engine) |
| 2022-06 | Serverless SQL warehouses |
| 2020-09 | Databricks Power BI connector |
| 2021-12 | Databricks Tableau connector (3-level namespace) |
| 2022-10 | Databricks SQL Driver for Node.js |
| 2022-12 | Databricks SQL Driver for Go |
| 2023-01 | OAuth for Power BI and Tableau |
| 2022-10 | Add data UI / create-table-from-file-upload |
| 2022-10 | Global search / unified workspace search |
| 2024-09 | Publish to Power BI (semantic models) |
| 2025-05 | Query snippets |
| 2025-07 | Power BI connector with ADBC (Arrow Database Connectivity) |
| 2026-02 | Query tags for SQL warehouses |
| 2026-03 | 5X-Large SQL warehouse size |
| 2022-07 | Notebook visualizations / data profiles |
| 2019-02 | Interactive charts / client-side chart types |

## 8. Notebooks & developer experience

| First seen | Product / Feature |
|---|---|
| 2018-05 | Secrets API / secret management |
| 2019-06 | Databricks Advisor |
| 2020-05 | Notebook-scoped Python libraries |
| 2020-07 | `%pip` / `%conda` magic commands |
| 2020-07 | Koalas (pandas-on-Spark) |
| 2020-10 | Jupyter (.ipynb) import/export |
| 2021-03 | Dark mode for notebooks |
| 2022-03 | Files in Repos / workspace files |
| 2022-08 | Monaco-based notebook editor |
| 2022-11 | Sparse Checkout for Repos |
| 2023-02 | Variable explorer in notebooks |
| 2023-03 | Improved / notebook-like file editor |
| 2023-04 | Python Black formatter |
| 2023-08 | Git merge/rebase/pull conflict resolution in Repos |
| 2024-01 | Databricks Widgets (UI-created) |
| 2024-01 | Quick Fix (Assistant inline fixes) |
| 2024-02 | Full-page AI-powered workspace search |
| 2024-03 | Interactive notebook debugging (line-by-line debugger) |
| 2024-06 | New Databricks Notebook UI |
| 2024-06 | Serverless notebooks environment manager |
| 2024-08 | Personalized notebook autocomplete |
| 2024-05 | Databricks Assistant autocomplete |
| 2026-02 | Python unit testing in the workspace (pytest) |
| 2026-05 | `%uv pip` (uv-based installs in serverless notebooks) |
| 2018-02 | SQL autocomplete |
| 2018-07 | RStudio integration / R Markdown support |
| 2020-03 | Shiny on Databricks |

## 9. SDKs, CLIs, drivers, IaC

| First seen | Product / Feature |
|---|---|
| 2019-06 | Databricks Connect (v1) |
| 2020-09 | Arrow-based ODBC/JDBC drivers |
| 2022-06 | Databricks Terraform provider |
| 2023-06 | Databricks SDK for Python |
| 2023-06 | Databricks SDK for Go |
| 2023-11 | Databricks SQL Connector for Python 3.0.0 |
| 2024-05 | Databricks JDBC driver |
| 2024-07 | New open-source Databricks JDBC Driver |
| 2025-06 | (OSS JDBC driver Apache-2.0) |
| 2024-12 | Jobs API 2.2 |
| 2021-10 | Jobs API 2.1 |
| 2022-01 | Databricks JDBC driver (SQL) |
| 2024-08 | For-each task (jobs) |
| 2023-07 | Run Job task |
| 2023-10 | If/else condition task |
| 2023-08 | Run-if task condition |
| 2022-08 | dbt task in Workflows |
| 2022-09 | Databricks SQL tasks in Workflows |
| 2026-03 | SQL alert task for jobs |
| 2025-10 | Unified runs list (jobs + pipelines) |

## 10. VS Code, Apps & external-tool integrations

| First seen | Product / Feature |
|---|---|
| 2023-02 | Databricks extension for Visual Studio Code |
| 2024-08 | Databricks Apps |
| 2025-03 | Databricks Connector for Google Sheets |
| 2025-09 | Databricks connector in Microsoft Power Platform |
| 2026-03 | Databricks Excel Add-in |
| 2026-04 | Connect Lovable apps to Databricks |
| 2026-03 | Databricks Apps telemetry (OpenTelemetry) |

## 11. MLflow & classic ML

| First seen | Product / Feature |
|---|---|
| 2018-03 | Databricks ML Model Export / MLeap export |
| 2018-05 | Databricks Runtime for Machine Learning |
| 2018-11 | HorovodRunner |
| 2019-02 | Managed MLflow on Databricks |
| 2019-06 | Hyperopt (SparkTrials) |
| 2020-03 | MLflow Model Registry |
| 2020-09 | MLflow Model Serving |
| 2021-05 | AutoML |
| 2022-01 | MLflow Model Registry Webhooks |
| 2023-03 | Models in Unity Catalog (govern MLflow models) |
| 2024-06 | MLflow Tracing |
| 2025-06 | MLflow 3.0 |
| 2025-06 | Deployment jobs (MLflow 3) |
| 2026-01 | MLflow traces in Unity Catalog (OpenTelemetry) |

## 12. Feature Store / feature engineering (beyond covered UC entry)

| First seen | Product / Feature |
|---|---|
| 2022-02 | Feature Store online store / automatic feature lookup |
| 2022-04 | Feature Store publish to DynamoDB |
| 2023-09 | On-demand feature computation |
| 2023-12 | Feature & Function Serving |
| 2024-03 | Feature Serving |
| 2025-09 | Databricks Online Feature Stores (Lakebase-powered) |
| 2026-03 | Declarative Feature Engineering APIs / Feature Views |

## 13. Generative AI, Mosaic AI, agents & Agent Bricks

| First seen | Product / Feature |
|---|---|
| 2023-12 | Foundation Model APIs |
| 2024-02 | AI Functions (SQL) |
| 2024-03 | DBRX (Base & Instruct) |
| 2024-05 | Foundation Model Training / Fine-tuning |
| 2024-05 | Pre-trained models in Unity Catalog |
| 2024-06 | Mosaic AI Agent Framework |
| 2024-06 | Agent Evaluation |
| 2024-06 | Function calling on FM APIs |
| 2024-06 | `vector_search()` SQL function |
| 2024-07 | Mosaic AI Model Training (umbrella) |
| 2024-07 | `ai_forecast()` |
| 2024-09 | AI Playground |
| 2024-09 | Mosaic AI Gateway (AI Gateway) |
| 2024-09 | AI Guardrails |
| 2024-10 | Structured outputs (Model Serving) |
| 2024-10 | Batch LLM inference (`ai_query`) |
| 2024-12 | Python code executor for AI agents |
| 2024-12 | `databricks-agents` SDK |
| 2024-12 | Synthetic evaluation sets |
| 2025-01 | AI agent tools / external service connections (MCP services) |
| 2025-03 | Information Extraction (Agent Bricks) |
| 2025-03 | Genie Conversation API **[adjacent]** |
| 2025-03 | Multi-agent systems (Genie in agents) |
| 2025-04 | Custom LLM (Agent Bricks) |
| 2025-05 | Knowledge Assistant (Agent Bricks) |
| 2025-06 | `ai_parse_document` |
| 2025-06 | Model Context Protocol (MCP) support |
| 2025-08 | External MCP servers |
| 2025-08 | Mosaic AI Vector Search reranker **[adjacent]** |
| 2025-09 | Data Science Agent (Assistant Agent mode) |
| 2025-10 | SQL MCP server |
| 2026-01 | Managed MCP servers |
| 2026-01 | Agent Skills (Assistant skills) |
| 2026-03 | Agent Bricks (umbrella brand) |
| 2026-03 | Classification (Agent Bricks) |
| 2026-03 | `ai_classify` / `ai_extract` (v2) |
| 2026-04 | Supervisor API **[adjacent]** |
| 2026-04 | `ai_prep_search` |
| 2026-04 | AI Gateway MCP governance |
| 2026-04 | Vector Search retrieval-quality evaluation **[adjacent]** |
| 2026-06 | Managed agent memory |
| 2026-06 | Omnigent (coding agent meta-harness) |
| 2026-06 | `ai_query` (GA general-purpose) |
| 2026-02 | AI Gateway (Beta / new UI, coding-agent control plane) |
| 2026-07 | Lakebridge Agentic Converter |
| 2026-04 | Sample Data Explorer (Genie Code) **[adjacent]** |

## 14. Databricks-hosted foundation models (Model Serving additions)

Numerous and named individually in the release notes — not distinct products, but listed in full per your instruction:

- **Meta Llama:** Llama 3 (2024-04), Llama 3.1 8B/70B/405B (2024-07), Llama 3.2 1B/3B (2024-09), Llama 3.3 70B (2024-12), Llama 4 Maverick (2025-04)
- **Anthropic Claude:** Sonnet 3.7 (2025-03), Sonnet 4.5 (2025-10), Opus 4.5 (2025-11), Haiku 4.5 (2025-12), Sonnet 4.6 (2026-02), Opus 4.6 (2026-02), Opus 4.7 (2026-04), Opus 4.8 (2026-05), Sonnet 5 (2026-06), Fable 5 (2026-06)
- **OpenAI:** GPT OSS 120B/20B (2025-08), GPT-5/mini/nano (2025-10), GPT-5.1 (2025-11), GPT-5.2 (2025-12), GPT-5.2 Codex (2026-01), GPT-5.1 Codex Max/Mini (2026-01), GPT-5.3 Codex (2026-02), GPT-5.4/mini/nano (2026-03), GPT-5.5 / 5.5 Pro (2026-04), GPT-5.6 Sol/Terra/Luna (2026-07)
- **Google:** Gemma 3 12B (2025-07), Gemini 2.5 Pro/Flash (2025-10), Gemini 3 Pro Preview (2025-11), Gemini 3 Flash (2025-12), Gemini 3.1 Pro Preview (2026-02), Gemini 3.1 Flash Lite (2026-03), Gemini 3.5 Flash (2026-05), Gemini 3.1 Flash Image / Gemini 3 Pro Image (2026-07)
- **Alibaba/other:** Qwen3-Next 80B A3B (2025-10), Qwen3-Embedding-0.6B (2026-02), Qwen3.5 122B A10B (2026-05)
- **Foundation model families:** GTE embeddings (2024-06)
- **Serving features:** Provisioned throughput FM APIs (2024-03), External models (2023-12/2024-03), Inference tables (2024-01), Route optimization (2024-04), Instance-profile serving endpoints (2024-03), Pay-per-token (2024-08), Custom rate limits via AI Gateway (2025-06), Multimodal support (2025-10), CPU_MEDIUM/CPU_LARGE workload types (2026-04), Custom LLM Serving / vLLM (2026-05), Endpoint telemetry to UC (2026-03), Feature Serving endpoints route optimization (2024-04)

## 15. Data sharing, Marketplace & Clean Rooms ecosystem

| First seen | Product / Feature |
|---|---|
| 2020-02 | Partner Integrations gallery / Data Ingestion Network |
| 2021-11 | Databricks Partner Connect |
| 2023-04 | Databricks Marketplace |
| 2023-06 | Marketplace private exchanges |
| 2023-11 | Solution Accelerators in Marketplace |
| 2024-01 | Model sharing via Marketplace / Delta Sharing |
| 2024-05 | Provider Analytics Dashboard |
| 2024-05 | Tableau Delta Sharing Connector |
| 2024-07 | Delta Sharing schema sharing |
| 2024-11 | Cross-platform view sharing |
| 2024-12 | Delta Sharing history sharing |
| 2025-06 | Salesforce Data Cloud File Sharing (zero-copy) |
| 2025-09 | SAP Business Data Cloud (BDC) Connector |
| 2026-06 | SecureConnect (share behind firewall) |
| 2025-11 | MCP Servers tab / Marketplace MCP listings |

## 16. Security, identity & networking

| First seen | Product / Feature |
|---|---|
| 2018-01 | Table Access Control (table ACLs) |
| 2018-09 | SCIM provisioning / SCIM API |
| 2020-04 | IAM credential passthrough / instance profiles |
| 2020-06 | Customer-managed VPC |
| 2020-06 | Secure cluster connectivity |
| 2020-06 | IP access lists |
| 2020-06 | Local disk encryption |
| 2020-06 | E2 platform architecture |
| 2020-07 | Inter-node encryption |
| 2020-07 | Token Management API |
| 2020-07 | Password access control |
| 2020-12 | Customer-managed keys (managed services) |
| 2021-05 | CMK for workspace storage |
| 2021-05 | Service principals |
| 2021-08 | Microsoft Entra ID SSO |
| 2022-08 | Identity federation |
| 2022-06 | Compliance security profile / Enhanced Security Monitoring |
| 2023-01 | Account SCIM |
| 2023-02 | SAML SSO in account console |
| 2023-05 | OAuth M2M for service principals |
| 2022-10 | AWS PrivateLink support |
| 2024-02 | Network Connectivity Configurations (NCC) / serverless firewall |
| 2024-02 | Enhanced Security and Compliance add-on |
| 2024-05 | Unified login |
| 2024-05 | Customer Managed Keys (incl. Vector Search) |
| 2024-11 | Service credentials |
| 2024-12 | Serverless egress control |
| 2025-04 | Databricks multi-factor authentication (MFA) |
| 2025-06 | Network policies (serverless egress) |
| 2025-10 | Context-based ingress control |
| 2026-01 | Front-end PrivateLink for perf-intensive services |
| 2026-02 | Scoped personal access tokens **[adjacent]** |
| 2026-05 | Automatic identity management (Entra/Okta sync, no SCIM) |
| 2026-05 | Account access denylist |
| 2026-07 | Custom URLs for Databricks account |
| 2026-07 | Private Link for account-level resources |

## 17. Compliance certifications

FedRAMP Moderate (2022-08), FedRAMP High / GovCloud (2024-04), PCI-DSS (2022-06), HIPAA (2022-06), UK Cyber Essentials Plus (2024-07), CCCS Medium / Protected B (2024-08), IL5 / DoD GovCloud (2025-01), K-FSI Korea (2025-05), C5 Germany (2025-09), TISAX (2025-11), ISMAP Japan (2026-02), HITRUST (2026-02).

## 18. Platform, account, cost & operations

| First seen | Product / Feature |
|---|---|
| 2018-05 | GDPR data-control features (retention/purge) |
| 2019-03 | Databricks Light |
| 2019-10 | Databricks Runtime for Genomics / Glow |
| 2020-06 | Billable usage log delivery |
| 2020-06 | Multi-workspace API / Account API |
| 2020-10 | Audit log delivery |
| 2020-11 | Databricks Free Edition (later Free Edition, 2025-11) |
| 2020-12 | New account console |
| 2023-06 | System tables |
| 2024-06 | Budgets |
| 2024-06 | Cost management / usage dashboard |
| 2024-10 | Serverless budget policies |
| 2025-07 | Databricks release notes RSS feed |
| 2026-03 | Databricks usage dashboard (GA) |
| 2026-06 | Managed disaster recovery |
| 2026-06 | Mission Critical add-on |
| 2026-06 | Lakehouse Replay (runtime regression testing) |

## 19. Lakebase sub-features (beyond covered Lakebase entry)

| First seen | Product / Feature |
|---|---|
| 2025-07 | Synced tables (Lakebase) **[adjacent]** |
| 2025-10 | Lakebase Autoscaling (scale-to-zero, branching, instant restore) **[adjacent]** |
| 2026-03 | Lakehouse Sync / Lakebase CDF **[adjacent]** |

## 20. Genie / Assistant sub-features (beyond covered entries)

| First seen | Product / Feature |
|---|---|
| 2026-06 | Full-page Genie Code **[adjacent]** |
| 2026-06 | Genie budgets **[adjacent]** |
| 2026-07 | Genie pay-as-you-go pricing **[adjacent]** |
| 2026-06 | Databricks Genie app in Microsoft Teams / Slack **[adjacent]** |
| 2025-11 | Microsoft Copilot Studio integration (Genie Agents) **[adjacent]** |
| 2026-06 | Microsoft Copilot Cowork integration (Genie) **[adjacent]** |

---

## How to use this

- **Genuinely absent marquee products** most worth adding to `rebricked`: Photon, Auto Loader, COPY INTO, Unity Catalog data lineage, Databricks Marketplace, Partner Connect, Databricks Apps, MLflow / Managed MLflow, MLflow Model Registry, AutoML, Foundation Model APIs, Mosaic AI Agent Framework, AI Gateway, Lakeflow Connect, Databricks Assistant→Genie Code sub-line, Cluster policies, Instance pools, System tables, Delta Sharing Marketplace, Databricks SQL Serverless / Photon, Databricks Connect, Terraform provider, VS Code extension, Databricks SDKs.
- **[adjacent]** items extend something already covered — add only if you want sub-feature granularity.
- The **hosted foundation models** and **Lakeflow Connect connectors** are the two highest-volume buckets; they are legitimately many, not minor, and are listed in full above.
