---
slug: snowflake-vs-databricks-fact-check
title: "Snowflake's Databricks comparison, fact-checked claim by claim"
description: Snowflake published a fifteen-minute case against Databricks in September 2026. We
  took every checkable claim about Databricks to the Databricks docs. Some hold. Some were
  true until a few weeks before publication. One uses a product name Databricks dropped in June.
kind: explainer
category: Data governance
author: Claude
authorLink: https://www.anthropic.com/claude
published: '2026-09-06'
updated: '2026-09-06'
verified: '2026-09-06'
staleAfter: '2027-03-06'
tags: [governance, iceberg, delta-lake, sharing, disaster-recovery, rbac, abac, snowflake, fact-check]
entries:
  - photon
  - sql-warehouse
  - delta-lake
  - liquid-clustering
  - unity-catalog
  - unity-catalog-managed-iceberg-tables
  - lakehouse-federation
  - role-based-access-control
  - attribute-based-access-control
  - identity-attributes
  - governed-tags
  - databricks-clean-rooms
  - delta-sharing
  - opensharing
  - secureconnect
  - mission-critical
scorecard:
- section: Compute
  claim: Compute docs assume "the simple form compute UI"
  accurate: 'Yes'
  misleading: 'yes'
  why: A page about classic compute is made to stand for all Databricks compute; serverless needs no sizing.
  quote: 'Requires manual node sizing, driver configuration, and cluster tuning. "The organization of this article assumes you are using the simple form compute UI" Note: This is the alleged "simple" configuration.'
  doc: The organization of this article assumes you are using the simple form compute UI.
  docLink: https://docs.databricks.com/aws/en/compute/configure#:~:text=assumes%20you%20are%20using%20the%20simple%20form%20compute%20UI
  anchor: compute-the-tuning-tax
- section: Compute
  claim: Needs manual node sizing and cluster tuning
  accurate: Yes, for classic compute
  misleading: 'yes'
  why: Omits serverless, where Databricks provisions and manages the compute.
  quote: Requires manual node sizing, driver configuration, and cluster tuning.
  doc: When you choose to use serverless compute, you can run workloads without provisioning any compute resources in your cloud account.
  docLink: https://docs.databricks.com/aws/en/compute/serverless/#:~:text=without%20provisioning%20any%20compute%20resources%20in%20your%20cloud%20account
  anchor: compute-the-tuning-tax
- section: Compute
  claim: Spin-up and spin-down latency causes idle cost or cold starts
  accurate: Yes, for classic compute
  misleading: 'yes'
  why: Omits pools and serverless, which exist to remove exactly this.
  quote: Cluster spin up and spin down latencies lead to costly idle time or user cold start delays.
  doc: When cluster nodes are created using the idle instances, cluster start and auto-scaling times are reduced.
  docLink: https://docs.databricks.com/aws/en/compute/pool-index#:~:text=cluster%20start%20and%20auto%2Dscaling%20times%20are%20reduced
  anchor: compute-the-tuning-tax
- section: Openness
  claim: UniForm generates Iceberg metadata asynchronously after every write, on the driver
  accurate: 'Yes'
  misleading: partly
  why: Fair about UniForm. Silent about managed Iceberg tables, the native alternative external engines can write.
  quote: UniForm executes asynchronous metadata translation jobs after every write operation, introducing driver overhead, protocol version constraints and write latency.
  doc: Databricks triggers metadata generation asynchronously after a Delta Lake write transaction completes. This metadata generation process uses the same compute that completed the Delta Lake transaction.
  docLink: https://docs.databricks.com/aws/en/delta/uniform#:~:text=triggers%20metadata%20generation%20asynchronously%20after%20a%20Delta%20Lake%20write%20transaction%20completes
  anchor: openness-uniform-delta-lake-and-liquid-clustering
- section: Openness
  claim: Delta Lake was built Spark first; other engines need connectors
  accurate: 'Yes'
  misleading: partly
  why: The connectors are open source, and Iceberg needs one per engine too.
  quote: Querying or writing to Delta tables from external engines like Trino, Flink or native warehouses requires custom connectors or proprietary translation layers, adding operational friction and query latency.
  doc: Delta Lake has connectors read and write Delta tables from various data processing engines like Apache Spark, Apache Flink, Apache Hive, Apache Trino, AWS Athena, and more.
  docLink: https://docs.delta.io/latest/index.html#:~:text=connectors%20read%20and%20write%20Delta%20tables%20from%20various%20data%20processing%20engines
  docLabel: The Delta Lake project docs say
  anchor: openness-uniform-delta-lake-and-liquid-clustering
- section: Openness
  claim: Liquid clustering forces writer version 7 and locks out external tools
  accurate: Partly. The version is right, "proprietary" is wrong
  misleading: 'yes'
  why: Clustering is a writer feature in the open Delta protocol, and open-source Delta Lake 3.1 writes clustered tables itself.
  quote: Databricks Liquid Clustering documentation warns that enabling Liquid Clustering forces Delta tables onto writer version 7, explicitly confirming that external Delta readers and third-party tools lacking support for these elevated writer protocol requirements flatly cannot write or interact with these tables.
  doc: Delta Lake tables with liquid clustering enabled use Delta writer version 7 and reader version 3. Delta clients that don't support these protocols cannot read these tables.
  docLink: https://docs.databricks.com/aws/en/delta/clustering#:~:text=use%20Delta%20writer%20version%207%20and%20reader%20version%203
  anchor: openness-uniform-delta-lake-and-liquid-clustering
- section: Openness
  claim: Foreign Iceberg tables are read-only with limited platform support
  accurate: 'Yes'
  misleading: 'no'
  why: A fair quote, fairly used.
  quote: Databricks states "Foreign Iceberg tables are read-only in Databricks and have limited platform support." What does "limited" mean?
  doc: Foreign Iceberg tables are read-only in Databricks and have limited platform support.
  docLink: https://docs.databricks.com/aws/en/iceberg/#:~:text=Foreign%20Iceberg%20tables%20are%20read%2Donly%20in%20Databricks%20and%20have%20limited%20platform%20support
  anchor: openness-the-asymmetric-walled-garden
- section: Openness
  claim: Unity Catalog rejects outbound Iceberg REST connections to Snowflake, Glue, Polaris
  accurate: 'Yes on substance: no writes to foreign catalogs. "Rejects connections" overstates'
  misleading: 'no'
  why: Read "outbound" as writes and the docs agree. The connections exist, read-only, and the article's own summary table says "read-only access".
  quote: For outbound federation, Unity Catalog rejects outbound Iceberg REST Catalog specifications when connecting to external ecosystems such as Snowflake, AWS Glue or open Apache Polaris endpoints.
  doc: Foreign catalogs, such as AWS Glue, Hive metastore, or Snowflake Horizon Catalog
  docLink: https://docs.databricks.com/aws/en/iceberg/#:~:text=AWS%20Glue%2C%20Hive%20metastore%2C%20or%20Snowflake%20Horizon%20Catalog
  anchor: openness-the-asymmetric-walled-garden
- section: Openness
  claim: Open-source Unity Catalog and the product share "a name and nothing else"
  accurate: 'No'
  misleading: 'yes'
  why: 'They share the REST API, path for path: both serve catalogs at /api/2.1/unity-catalog/catalogs.'
  quote: The open source Unity Catalog project and the Unity Catalog embedded in Databricks' commercial platform share a name and nothing else.
  doc: Unity Catalog is also available as an open-source implementation.
  docLink: https://docs.databricks.com/aws/en/data-governance/unity-catalog/#:~:text=also%20available%20as%20an%20open%2Dsource%20implementation
  anchor: openness-the-asymmetric-walled-garden
- section: Openness
  claim: Open-source Unity Catalog is mostly Databricks commits
  accurate: Not supported by the repo
  misleading: unsupported
  why: A Databricks address is on a third of commits, not a majority. The rest are Gmail and hidden addresses, which say nothing about employer either way.
  quote: The majority of open source Unity Catalog contributions come from Databricks employees. Strip away the Databricks payroll and the "community" nearly disappears.
  doc: 850 commits on the default branch, 142 distinct author addresses, 33 percent from databricks.com, 26 percent from gmail.com, 30 percent hidden behind GitHub noreply.
  docLink: https://github.com/unitycatalog/unitycatalog/tree/58d5c7b2867d76801dc991b055d6ea2c70d2d811
  docLabel: We measured in the repository
  anchor: openness-the-asymmetric-walled-garden
- section: Openness
  claim: 'Apache Polaris commits: Dremio 38 percent, Snowflake 7.6 percent'
  accurate: Does not reproduce from the repo
  misleading: 'yes'
  why: By the method the footnote states, author email domain, Dremio is on 2.1 percent and Snowflake on 3.5 percent of human commits. A dependency bot wrote almost a third of all commits.
  quote: As of September 2026, Snowflake accounts for just 7.6% of commits, while co-creator Dremio accounts for 38%
  doc: '3,821 commits, 1,224 by a dependency bot. Of the 2,597 human commits: gmail.com 25 percent, apache.org 22 percent, snowflake.com 3.5 percent, dremio.com 2.1 percent.'
  docLink: https://github.com/apache/polaris/tree/015f6b079f6563a890bfed3aec1aacf5c4259787
  docLabel: We measured in the repository
  anchor: openness-the-asymmetric-walled-garden
- section: Security
  claim: '"In Databricks, a role is implemented as a group"'
  accurate: 'Yes'
  misleading: 'no'
  why: The quote is exact and in context. "Lacks a true RBAC engine" is the opinion built on it, and the reader can see the seam.
  quote: 'Databricks lacks a true RBAC engine. Through their own documentation: "In Databricks, a role is implemented as a group"'
  doc: In Databricks, a role is implemented as a group.
  docLink: https://docs.databricks.com/aws/en/security/auth/rbac/#:~:text=In%20Databricks%2C%20a%20role%20is%20implemented%20as%20a%20group
  anchor: security-rbac
- section: Security
  claim: Role assumption was introduced in 2026
  accurate: 'Yes'
  misleading: 'no'
  why: Public Preview on July 22, 2026 and generally available on August 19, 2026.
  quote: This is a security foundation Databricks only introduced in 2026 as a retrofitted feature struggling to catch up, and over a decade late.
  doc: Role-based access control (RBAC) is now generally available. RBAC lets users assume a role in Databricks.
  docLink: https://docs.databricks.com/aws/en/release-notes/product/2026/august#:~:text=Role%2Dbased%20access%20control%20%28RBAC%29%20is%20now%20generally%20available
  anchor: security-rbac
- section: Security
  claim: Role assumption requires compute-context switches
  accurate: No, as worded
  misleading: 'yes'
  why: One documented method is presented as the only one. The reader is left believing a role change means a compute change.
  quote: Databricks patches workspace groups to simulate roles, forcing administrators to navigate complex assignment logic, resolve workspace entitlement overlaps and initiate compute-context switches whenever users scope permissions.
  doc: Users can assume the role through several methods, including the role switcher in the Workspace UI, dedicated access mode clusters assigned to a group, the CLI, the API, and third-party BI tools.
  docLink: https://docs.databricks.com/aws/en/security/auth/rbac/#:~:text=including%20the%20role%20switcher%20in%20the%20Workspace%20UI
  anchor: security-rbac
- section: Security
  claim: Admins must resolve "workspace entitlement overlaps"
  accurate: Not documented
  misleading: unsupported
  why: The limitations page lists unsupported features, group-management limits and a 100-group cap. Nothing on it is called an entitlement overlap.
  quote: '...forcing administrators to navigate complex assignment logic, resolve workspace entitlement overlaps and initiate compute-context switches whenever users scope permissions.'
  doc: Workspace asset sharing controls can be applied to a maximum of 100 groups by default.
  docLink: https://docs.databricks.com/aws/en/security/auth/rbac/limitations#:~:text=applied%20to%20a%20maximum%20of%20100%20groups%20by%20default
  anchor: security-rbac
- section: Security
  claim: Cannot tag users, so policies must hardcode groups in UDFs
  accurate: Partly, and outdated by two weeks
  misleading: 'yes'
  why: Identity attributes in ABAC column masks shipped in Beta on August 17, two weeks before publication. Policies target users, groups and service principals directly, without a UDF.
  quote: Because user tags literally do not exist in Databricks, evaluating user attributes requires hardcoding group names into custom SQL UDF wrappers that must be manually applied.
  doc: You can now write Unity Catalog ABAC column mask policy conditions that target users by attributes synced from your identity provider, such as department or country, in addition to group membership.
  docLink: https://docs.databricks.com/aws/en/release-notes/product/2026/august#:~:text=target%20users%20by%20attributes%20synced%20from%20your%20identity%20provider
  anchor: security-abac-and-tagging-users
- section: Security
  claim: No native differential privacy policies
  accurate: Consistent with the docs
  misleading: 'no'
  why: The Clean Rooms page does not mention differential privacy, noise, or a privacy budget. An absence in the docs, not a sentence we can cite.
  quote: Unlike Snowflake, Databricks leaves this layer to manual query auditing or third-party tools.
  doc: a secure and privacy-protecting environment where multiple parties can work together on sensitive enterprise data without direct access to each other's data
  docLink: https://docs.databricks.com/aws/en/clean-rooms/#:~:text=without%20direct%20access%20to%20each%20other%27s%20data
  anchor: security-differential-privacy
- section: Sharing
  claim: Recipients bring and pay for their own compute
  accurate: 'Yes'
  misleading: 'yes'
  why: Framing. The article's own Snowflake pitch has consumers query "using their existing warehouses", which they also pay for.
  quote: In a standard Delta Sharing architecture, external consumers typically bring and pay for their own compute engine just to process your shared data.
  doc: 'It includes instructions for reading shared data using the following tools: Iceberg clients, Apache Spark, Pandas, Power BI, Tableau'
  docLink: https://docs.databricks.com/aws/en/opensharing/read-data-open#:~:text=reading%20shared%20data%20using%20the%20following%20tools
  anchor: sharing-the-recipient-penalty
- section: Sharing
  claim: Recipients bear egress, implied by contrast with Snowflake
  accurate: No. The docs put egress on the provider
  misleading: 'yes'
  why: The implication points the wrong way. The Databricks egress page is titled "for providers".
  quote: Snowflake's Auto-Fulfillment handles data replication automatically, removing egress for the consumer
  doc: OpenSharing within a region incurs no egress cost. Unlike other data sharing platforms, OpenSharing does not require data replication. This model has many advantages, but it means that your cloud vendor may charge data egress fees when you share data across clouds or regions.
  docLink: https://docs.databricks.com/aws/en/opensharing/#:~:text=OpenSharing%20within%20a%20region%20incurs%20no%20egress%20cost
  anchor: sharing-the-recipient-penalty
- section: Sharing
  claim: Recipients end up copying the data locally anyway
  accurate: Behaviour, not documentation
  misleading: unsupported
  why: A claim about what recipients do, stated as typical with no evidence. The docs say replication is not required.
  quote: recipients often end up building custom ingestion pipelines to copy the data locally anyway
  doc: Unlike other data sharing platforms, OpenSharing does not require data replication.
  docLink: https://docs.databricks.com/aws/en/opensharing/#:~:text=OpenSharing%20does%20not%20require%20data%20replication
  anchor: sharing-the-recipient-penalty
- section: Sharing
  claim: Recipients cannot re-share downstream
  accurate: Partly documented
  misleading: 'no'
  why: 'The one documented rule points the article''s way: a received table cannot be wrapped in a view and shared on. Whether a received table can be shared directly is not written down.'
  quote: complex B2B scenarios like automated multi-tier resharing across a supply chain are restricted by rigid recipient requirements
  doc: You cannot share views that reference shared tables or shared views.
  docLink: https://docs.databricks.com/aws/en/opensharing/create-share#:~:text=You%20cannot%20share%20views%20that%20reference%20shared%20tables%20or%20shared%20views
  anchor: sharing-the-recipient-penalty
- section: Continuity
  claim: Managed DR skips materialized views, secrets, models, shares, and more
  accurate: 'Yes'
  misleading: 'no'
  why: Every item is on the page.
  quote: Databricks' own Managed Disaster Recovery documentation says it does not replicate materialized views, streaming tables, Lakeflow pipelines, Unity Catalog or workspace secrets, ML models, model serving endpoints, vector search indexes, Delta shares, published AI/BI dashboards, or Structured Streaming outside Lakeflow.
  doc: materialized views, streaming tables, Lakeflow pipelines, managed volume data (metadata replicates), Unity Catalog and workspace secrets, ML models, model serving endpoints, vector search indexes, Delta shares, published AI/BI dashboards (drafts replicate), and Spark Structured Streaming outside Lakeflow pipelines.
  docLink: https://docs.databricks.com/aws/en/admin/managed-disaster-recovery#:~:text=Unity%20Catalog%20and%20workspace%20secrets%2C%20ML%20models%2C%20model%20serving%20endpoints%2C%20vector%20search%20indexes%2C%20Delta%20shares
  anchor: continuity-managed-disaster-recovery
- section: Continuity
  claim: External locations recreated, compute arrives stopped, two-week bootstrap
  accurate: 'Yes'
  misleading: 'no'
  why: Accurate on every point. The article omits that managed DR is a gated Public Preview sold through the Mission Critical add-on.
  quote: After failover, SQL warehouses arrive stopped, clusters arrive terminated, and administrators must manually resume job schedules. Databricks also warns that initial workspace replication can take up to two weeks for large workspaces.
  doc: SQL warehouses are replicated in STOPPED state, clusters in TERMINATED state. Job schedules in the secondary are paused.
  docLink: https://docs.databricks.com/aws/en/admin/managed-disaster-recovery#:~:text=SQL%20warehouses%20are%20replicated%20in%20STOPPED%20state%2C%20clusters%20in%20TERMINATED%20state
  anchor: continuity-managed-disaster-recovery
- section: Continuity
  claim: Cross-region DR needs custom synchronization scripts
  accurate: No. Managed DR is cross-region and needs no scripts
  misleading: 'yes'
  why: It attributes to cross-region what is true only of cross-cloud.
  quote: Achieving true cross-region or cross-cloud resilience in Databricks requires data engineering teams to write, test, and maintain custom synchronization scripts to replicate underlying cloud storage buckets, metastore databases and compute configurations.
  doc: Managed disaster recovery (DR) replicates your Databricks deployment to a secondary region so you can recover from a regional outage in minutes. You do not write or maintain replication scripts.
  docLink: https://docs.databricks.com/aws/en/admin/managed-disaster-recovery#:~:text=You%20do%20not%20write%20or%20maintain%20replication%20scripts
  anchor: continuity-managed-disaster-recovery
- section: Continuity
  claim: Cross-cloud DR is not covered
  accurate: 'Yes'
  misleading: 'no'
  why: The secondary must be on the same cloud as the primary.
  quote: Cross-cloud DR requires DIY scripts.
  doc: A secondary workspace and Unity Catalog metastore in the secondary region, in the same Databricks account and on the same cloud as your primary.
  docLink: https://docs.databricks.com/aws/en/admin/managed-disaster-recovery#:~:text=on%20the%20same%20cloud%20as%20your%20primary
  anchor: continuity-managed-disaster-recovery
- section: Money
  claim: Minimal financial incentives to optimise
  accurate: Opinion
  misleading: 'yes'
  why: Commitment discounts exist, the same shape the article credits Snowflake with. And a faster job earning the vendor less is true of any consumption model, Snowflake's included.
  quote: Standard DBU consumption with minimal financial optimization incentives.
  doc: Databricks offers you opportunities to access discounts and other benefits when you commit to certain levels of usage.
  docLink: https://www.databricks.com/product/pricing#:~:text=when%20you%20commit%20to%20certain%20levels%20of%20usage
  anchor: money-the-consumption-penalty
sources:
  - url: https://www.snowflake.com/en/blog/engineering/snowflake-vs-databricks/
    kind: internet
    label: 'Snowflake engineering blog: Beyond the Benchmark (September 3, 2026) - the article being checked'
  - url: https://docs.databricks.com/aws/en/compute/configure
    kind: official
    label: 'Databricks: compute configuration reference (the "simple form" sentence)'
  - url: https://docs.databricks.com/aws/en/compute/serverless/
    kind: official
    label: 'Databricks: connect to serverless compute'
  - url: https://docs.databricks.com/aws/en/compute/sql-warehouse/
    kind: official
    label: 'Databricks: SQL warehouses, serverless advantages'
  - url: https://docs.databricks.com/aws/en/compute/sql-warehouse/create
    kind: official
    label: 'Databricks: create a SQL warehouse (auto stop defaults)'
  - url: https://www.databricks.com/product/pricing
    kind: official
    label: 'Databricks: pricing (per-second billing, usage commitments)'
  - url: https://docs.databricks.com/aws/en/compute/photon
    kind: official
    label: 'Databricks: what is Photon'
  - url: https://docs.databricks.com/aws/en/compute/pool-index
    kind: official
    label: 'Databricks: pools (reduced cluster start times, idle instance billing)'
  - url: https://docs.databricks.com/aws/en/security/auth/rbac/limitations
    kind: official
    label: 'Databricks: RBAC limitations'
  - url: https://github.com/unitycatalog/unitycatalog/blob/58d5c7b2867d76801dc991b055d6ea2c70d2d811/api/all.yaml
    kind: official
    label: 'Unity Catalog OSS OpenAPI spec, pinned commit: /api/2.1/unity-catalog paths'
  - url: https://docs.databricks.com/api/workspace/catalogs/list
    kind: official
    label: 'Databricks REST API reference: GET /api/2.1/unity-catalog/catalogs'
  - url: https://docs.databricks.com/aws/en/delta/uniform
    kind: official
    label: 'Databricks: read Delta Lake tables with Iceberg clients (UniForm)'
  - url: https://docs.databricks.com/aws/en/delta/index
    kind: official
    label: 'Databricks: what is Delta Lake'
  - url: https://docs.delta.io/latest/index.html
    kind: official
    label: 'Delta Lake project docs: connectors and engines'
  - url: https://docs.delta.io/latest/delta-clustering.html
    kind: official
    label: 'Delta Lake project docs: liquid clustering in open-source Delta Lake 3.1.0'
  - url: https://docs.databricks.com/aws/en/delta/clustering
    kind: official
    label: 'Databricks: liquid clustering (protocol versions)'
  - url: https://docs.databricks.com/aws/en/tables/features/feature-compatibility
    kind: official
    label: 'Databricks: Delta Lake feature compatibility and protocols'
  - url: https://github.com/delta-io/delta/blob/f2ab013ee75be00a9e832140f44f52a9febad1ba/PROTOCOL.md
    kind: official
    label: 'Delta Lake transaction log protocol, pinned commit (Clustered Table writer feature)'
  - url: https://docs.databricks.com/aws/en/iceberg/
    kind: official
    label: 'Databricks: what is Apache Iceberg in Databricks (foreign Iceberg tables are read-only)'
  - url: https://docs.databricks.com/aws/en/external-access/iceberg
    kind: official
    label: 'Databricks: access Databricks tables from Apache Iceberg clients'
  - url: https://docs.databricks.com/aws/en/data-governance/unity-catalog/
    kind: official
    label: 'Databricks: what is Unity Catalog (open-source implementation sentence)'
  - url: https://github.com/unitycatalog/unitycatalog/blob/58d5c7b2867d76801dc991b055d6ea2c70d2d811/README.md
    kind: official
    label: 'Unity Catalog OSS README, pinned commit: LF AI and Data sandbox project, Apache 2.0'
  - url: https://github.com/unitycatalog/unitycatalog/tree/58d5c7b2867d76801dc991b055d6ea2c70d2d811
    kind: official
    label: 'Unity Catalog OSS repository at the commit we measured (September 4, 2026)'
  - url: https://github.com/apache/polaris/tree/015f6b079f6563a890bfed3aec1aacf5c4259787
    kind: official
    label: 'Apache Polaris repository at the commit we measured (September 5, 2026)'
  - url: https://github.com/OpenSharing-IO/OpenSharing/tree/ca251c87cd9e1bd741b3d81882b603788ab90d2f
    kind: official
    label: 'OpenSharing protocol specification repo, pinned commit'
  - url: https://github.com/delta-io/delta/blob/f2ab013ee75be00a9e832140f44f52a9febad1ba/spark/src/main/scala/org/apache/spark/sql/delta/skipping/clustering/ClusteredTableUtils.scala
    kind: official
    label: 'Delta Lake OSS source, pinned commit: ClusteredTableUtils in the Spark module'
  - url: https://docs.databricks.com/aws/en/security/auth/rbac/
    kind: official
    label: 'Databricks: role-based access control'
  - url: https://docs.databricks.com/aws/en/release-notes/product/2026/july
    kind: official
    label: 'Databricks release notes, July 2026 (RBAC Public Preview)'
  - url: https://docs.databricks.com/aws/en/release-notes/product/2026/august
    kind: official
    label: 'Databricks release notes, August 2026 (RBAC GA, identity attributes, context attributes)'
  - url: https://docs.databricks.com/aws/en/admin/governed-tags/
    kind: official
    label: 'Databricks: governed tags (what can be tagged)'
  - url: https://docs.databricks.com/aws/en/admin/users-groups/identity-attributes/
    kind: official
    label: 'Databricks: identity attributes (Beta, users only)'
  - url: https://docs.databricks.com/aws/en/data-governance/unity-catalog/abac/policies
    kind: official
    label: 'Databricks: ABAC policies (principals a policy applies to)'
  - url: https://docs.databricks.com/aws/en/clean-rooms/
    kind: official
    label: 'Databricks: what is Databricks Clean Rooms'
  - url: https://docs.databricks.com/aws/en/opensharing/
    kind: official
    label: 'Databricks: what is OpenSharing (replication, egress)'
  - url: https://docs.databricks.com/aws/en/opensharing/manage-egress
    kind: official
    label: 'Databricks: monitor and manage OpenSharing egress costs (for providers)'
  - url: https://docs.databricks.com/aws/en/opensharing/read-data-open
    kind: official
    label: 'Databricks: read data shared with bearer tokens (recipient tools)'
  - url: https://docs.databricks.com/aws/en/opensharing/create-share
    kind: official
    label: 'Databricks: create shares for OpenSharing (limitation: views over shared tables cannot be shared)'
  - url: https://docs.databricks.com/aws/en/opensharing/read-data-databricks
    kind: official
    label: 'Databricks: read Databricks-to-Databricks shared data (read-only catalogs)'
  - url: https://docs.databricks.com/aws/en/release-notes/product/2026/june
    kind: official
    label: 'Databricks release notes, June 2026 (Delta Sharing is now OpenSharing; managed DR Public Preview)'
  - url: https://docs.databricks.com/aws/en/admin/managed-disaster-recovery
    kind: official
    label: 'Databricks: managed disaster recovery'
---

On September 3, 2026, Snowflake's engineering blog published a fifteen-minute post titled
"Beyond the Benchmark: The Real World Total Cost, Security and Agility of Enterprise Data
Platforms". It is a vendor comparison, so nobody expects it to be neutral. But it does
something unusual for the genre: it quotes Databricks documentation, with links. That makes it
checkable.

So we checked it. Every claim below is a claim the article makes about Databricks. Under each
one is what the Databricks docs said on September 6, 2026, with the sentence linked. Where a
claim is about an open-source project rather than a product, we went to the repository
instead, pinned to a commit. Claims about Snowflake's own product are out of scope; this site
tracks Databricks names, not Snowflake ones. The one exception is the article's Apache Polaris
commit statistics, because they are offered as the contrast to Unity Catalog's and the same
measurement covers both.

Two verdicts per claim. "Accurate?" asks whether the docs say what Snowflake says they say.
"Misleading?" asks whether a reader who takes the claim at face value ends up believing
something false about Databricks. The two are independent: a claim can be word-for-word true
and still mislead, and a claim can be wrong on a detail that changes nothing. The first verdict
is a fact check. The second is judgement, and the criteria for it are stated in the box below
the ledger, so you can disagree with them.

:::note
**Who wrote this.** This guide was researched and written by Claude, an AI model made by
Anthropic, working directly against the live Databricks documentation, the Snowflake article,
and the public repositories linked on this page. A human ran the tooling, asked the questions,
and pushed back where a reading seemed too literal. Neither works for Snowflake or Databricks.
Every verdict has its source sentence linked so it can be checked without trusting either of us.
:::

## The scorecard

{{scorecard}}

:::judgement
How we decided "misleading". A claim is misleading when a reader who believes it as written
ends up with a false picture of Databricks, whether or not the words are literally true. Three
patterns account for almost every "yes" above. Omission: true of classic compute, silent about
serverless; true of DBU pricing, silent about commitment discounts. Staleness: true until a
release a few weeks before publication. Framing: true of both platforms, presented as a
Databricks weakness. A claim is "not misleading" when the docs back it and the reader would
not be surprised by the surrounding context. "Unsupported" is reserved for claims neither the
docs nor the repositories can confirm or refute; we do not call a claim misleading just because
we cannot check it, only because we checked it and the picture it paints is wrong.
:::

## Compute: the tuning tax

**The claim.** Databricks requires manual node sizing, driver configuration, and cluster
tuning. As evidence, the article quotes a Databricks sentence: "The organization of this
article assumes you are using the simple form compute UI", and adds that this is the alleged
simple configuration.

**The docs.** The quote is real. The compute configuration page does say it
[assumes you are using the simple form compute UI](https://docs.databricks.com/aws/en/compute/configure#:~:text=assumes%20you%20are%20using%20the%20simple%20form%20compute%20UI).
That page describes classic compute, which you do size yourself.

What the article leaves out is that Databricks also sells compute you do not size. With
serverless compute, you
[run workloads without provisioning any compute resources in your cloud account](https://docs.databricks.com/aws/en/compute/serverless/#:~:text=without%20provisioning%20any%20compute%20resources%20in%20your%20cloud%20account),
and Databricks says this
[minimizes idle time, and reduces the need to manage compute resources](https://docs.databricks.com/aws/en/compute/serverless/#:~:text=minimizes%20idle%20time%2C%20and%20reduces%20the%20need%20to%20manage%20compute%20resources).
For SQL, a serverless {{entry:sql-warehouse}} promises that
[capacity management, patching, upgrades, and performance optimization are all handled by Databricks](https://docs.databricks.com/aws/en/compute/sql-warehouse/#:~:text=Capacity%20management%2C%20patching%2C%20upgrades%2C%20and%20performance%20optimization%20are%20all%20handled%20by%20Databricks),
and its auto stop
[default is 10 minutes](https://docs.databricks.com/aws/en/compute/sql-warehouse/create#:~:text=The%20default%20is%2010%20minutes).
On billing, the pricing page says you
[only pay for the products you use at per second granularity](https://www.databricks.com/product/pricing#:~:text=at%20per%20second%20granularity).

**The claim.** Cluster spin-up and spin-down latencies lead to costly idle time or user
cold-start delays.

**The docs.** True of a classic cluster, and Databricks sells two things to remove it. Pools
keep warm instances so that
[cluster start and auto-scaling times are reduced](https://docs.databricks.com/aws/en/compute/pool-index#:~:text=cluster%20start%20and%20auto%2Dscaling%20times%20are%20reduced),
at a price the docs state plainly:
[Databricks does not charge DBUs while instances are idle in the pool](https://docs.databricks.com/aws/en/compute/pool-index#:~:text=Databricks%20does%20not%20charge%20DBUs%20while%20instances%20are%20idle%20in%20the%20pool),
but the cloud provider still bills them. Serverless SQL warehouses go further and promise
that they
[eliminate waiting for infrastructure resources](https://docs.databricks.com/aws/en/compute/sql-warehouse/#:~:text=Eliminates%20waiting%20for%20infrastructure%20resources).
So the idle-time trade-off the article describes is real, and it is the trade-off the
serverless option was built to end.

**Verdict.** Holds for classic compute. Pools and serverless exist because it does. Misleading by omission, for the same reason.

One small correction. The article calls Photon a "Spark engine". Databricks describes
{{entry:photon}} as
[the Databricks-native vectorized query engine](https://docs.databricks.com/aws/en/compute/photon#:~:text=the%20Databricks%2Dnative%20vectorized%20query%20engine).
It runs Spark workloads. It is not Apache Spark.

**Verdict.** Holds for classic compute. It ignores that the serverless option exists. Misleading by omission: a page about classic compute is made to stand for all Databricks compute.

:::judgement
The comparison in the article is Snowflake's serverless warehouse against Databricks' classic
cluster. The fair comparison is serverless against serverless. Whether Databricks serverless
costs more or less than a Snowflake warehouse for your SQL is a question for your own bill,
not for either vendor's blog.
:::

## Openness: UniForm, Delta Lake, and liquid clustering

**The claim.** UniForm runs asynchronous metadata translation jobs after every write,
introducing driver overhead, protocol version constraints, and write latency.

**The docs.** This is accurate. Databricks
[triggers metadata generation asynchronously after a Delta Lake write transaction completes](https://docs.databricks.com/aws/en/delta/uniform#:~:text=triggers%20metadata%20generation%20asynchronously%20after%20a%20Delta%20Lake%20write%20transaction%20completes),
and that process
[uses the same compute that completed the Delta Lake transaction](https://docs.databricks.com/aws/en/delta/uniform#:~:text=uses%20the%20same%20compute%20that%20completed%20the%20Delta%20Lake%20transaction).
To limit the latency, tables with frequent commits
[might group multiple Delta Lake commits into a single commit to Iceberg metadata](https://docs.databricks.com/aws/en/delta/uniform#:~:text=might%20group%20multiple%20Delta%20Lake%20commits%20into%20a%20single%20commit%20to%20Iceberg%20metadata).
The protocol constraint is real too:
[the Delta Lake table must have a](https://docs.databricks.com/aws/en/delta/uniform#:~:text=The%20Delta%20Lake%20table%20must%20have%20a)
minimum reader version of 2 and writer version of 7. And the result is one-directional:
[Iceberg client support is read-only](https://docs.databricks.com/aws/en/delta/uniform#:~:text=Iceberg%20client%20support%20is%20read%2Donly).

The article does not mention that Databricks now also has
{{entry:unity-catalog-managed-iceberg-tables}}, which are native Iceberg tables rather than
translated Delta tables. External engines
[read from and write to Unity Catalog-registered Iceberg tables](https://docs.databricks.com/aws/en/external-access/iceberg#:~:text=read%20from%20and%20write%20to%20Unity%20Catalog%2Dregistered%20Iceberg%20tables)
through the Iceberg REST catalog. UniForm is the bridge for existing Delta tables, not the
only Iceberg story.

**Verdict.** Holds. Not misleading about UniForm itself. It misleads only if read as the whole Iceberg story, because managed Iceberg tables go unmentioned.

**The claim.** Delta Lake was built Spark first, and other engines need custom connectors or
translation layers.

**The docs.** Databricks says {{entry:delta-lake}}
[is open source software that extends Parquet data files](https://docs.databricks.com/aws/en/delta/index#:~:text=Delta%20Lake%20is%20open%20source%20software%20that%20extends%20Parquet%20data%20files)
and that it was
[developed for tight integration with Structured Streaming](https://docs.databricks.com/aws/en/delta/index#:~:text=developed%20for%20tight%20integration%20with%20Structured%20Streaming),
which is a Spark API. So yes, Spark first. But the same page says the transaction log has a
[well-defined open protocol that can be used by any system to read the log](https://docs.databricks.com/aws/en/delta/index#:~:text=well%2Ddefined%20open%20protocol%20that%20can%20be%20used%20by%20any%20system%20to%20read%20the%20log),
and the Delta Lake project lists
[connectors read and write Delta tables from various data processing engines](https://docs.delta.io/latest/index.html#:~:text=connectors%20read%20and%20write%20Delta%20tables%20from%20various%20data%20processing%20engines),
naming Flink, Hive, Trino, and Athena. Every table format needs a connector per engine.
Iceberg does too.

**Verdict.** Holds, with context. "Needs connectors" describes Iceberg as much as Delta. Partly misleading: the connectors are open source, and the sentence would be as true of Iceberg.

**The claim.** Liquid clustering forces Delta tables onto writer version 7, so external Delta
readers and third-party tools cannot write to or interact with these tables. The article calls
this a proprietary engine-level writer requirement, not an open layout standard.

**The docs.** The version number is right. Tables with {{entry:liquid-clustering}}
[use Delta writer version 7 and reader version 3](https://docs.databricks.com/aws/en/delta/clustering#:~:text=use%20Delta%20writer%20version%207%20and%20reader%20version%203),
and
[Delta clients that don't support these protocols cannot read these tables](https://docs.databricks.com/aws/en/delta/clustering#:~:text=Delta%20clients%20that%20don%27t%20support%20these%20protocols%20cannot%20read%20these%20tables).

The "proprietary" part is where it goes wrong. Clustering is defined in the open Delta
protocol, in the
[Clustered Table section](https://github.com/delta-io/delta/blob/f2ab013ee75be00a9e832140f44f52a9febad1ba/PROTOCOL.md#clustered-table),
as a writer feature named `clusteredTable`. Databricks' own compatibility page explains that
writer features
[require minWriterVersion=7 but don't block reader clients](https://docs.databricks.com/aws/en/tables/features/feature-compatibility#:~:text=but%20don%27t%20block%20reader%20clients),
and that
[the open source Delta Lake protocol has standardized on table features](https://docs.databricks.com/aws/en/tables/features/feature-compatibility#:~:text=The%20open%20source%20Delta%20Lake%20protocol%20has%20standardized%20on%20table%20features).
Open-source Delta Lake writes clustered tables itself: the feature is
[available in Delta Lake 3.1.0 and above](https://docs.delta.io/latest/delta-clustering.html#:~:text=available%20in%20Delta%20Lake%203.1.0%20and%20above),
and there the tables
[use Delta writer version 7 and reader version 1](https://docs.delta.io/latest/delta-clustering.html#:~:text=use%20Delta%20writer%20version%207%20and%20reader%20version%201).
The implementation is in the open-source repo, not behind a Databricks wall: the Spark module
carries a
[ClusteredTableUtils](https://github.com/delta-io/delta/blob/f2ab013ee75be00a9e832140f44f52a9febad1ba/spark/src/main/scala/org/apache/spark/sql/delta/skipping/clustering/ClusteredTableUtils.scala)
that checks the `clusteredTable` feature and writes clustered tables from plain Apache Spark.

Note the difference in reader version. Open-source Delta says 1. Databricks says 3. That is
because Databricks turns on other features by default when it creates a table, and some of
those are reader features. The lock-out the article describes is real for old clients, but it
comes from the bundle of defaults, not from clustering.

**Verdict.** Partly holds. The protocol requirement is real. "Proprietary" is not: the feature
is in the open spec and open-source Delta Lake writes it. Misleading, because the false word
is the one doing the work.

## Openness: the "asymmetric walled garden"

**The claim.** Databricks lets external engines in through Unity Catalog's Iceberg REST
endpoint, but rejects outbound Iceberg REST connections to Snowflake, AWS Glue, or Apache
Polaris. Tables from external catalogs are read-only, quoting "Foreign Iceberg tables are
read-only in Databricks and have limited platform support."

**The docs.** The quote is exact and current. A foreign Iceberg table is one managed by a
catalog outside Unity Catalog. Databricks
[uses Lakehouse Federation to retrieve metadata and read the table from object storage](https://docs.databricks.com/aws/en/iceberg/#:~:text=uses%20Lakehouse%20Federation%20to%20retrieve%20metadata%20and%20read%20the%20table%20from%20object%20storage),
and
[foreign Iceberg tables are read-only in Databricks and have limited platform support](https://docs.databricks.com/aws/en/iceberg/#:~:text=Foreign%20Iceberg%20tables%20are%20read%2Donly%20in%20Databricks%20and%20have%20limited%20platform%20support).

One word needs care. "Rejects outbound connections" reads at first as "will not connect", and
that is not what the docs say: the same page lists the foreign catalogs
{{entry:lakehouse-federation}} connects to:
[AWS Glue, Hive metastore, or Snowflake Horizon Catalog](https://docs.databricks.com/aws/en/iceberg/#:~:text=AWS%20Glue%2C%20Hive%20metastore%2C%20or%20Snowflake%20Horizon%20Catalog).
Read "outbound" as "outbound writes", though, which is what the surrounding sentences mean,
and the claim holds: Databricks connects to Snowflake Horizon and Glue, reads their Iceberg
tables, and writes nothing back. The article's own summary table puts it correctly as
"read-only access". The sentence overstates; the section does not.

We could not find a Databricks doc for a generic Iceberg REST catalog connection, Polaris
included. We also could not find one that says it is unsupported. Absence of a page is not a
citation, so we leave that specific point open.

**Verdict.** Holds on substance: foreign Iceberg catalogs are read-only, so there are no
outbound writes. "Rejects connections" overstates, since the read-only connections exist. Not
misleading, because the article's summary table states the read-only point correctly.

:::judgement
The asymmetry is real: external engines can write Unity Catalog's Iceberg tables, and Unity
Catalog can only read everyone else's. Whether that is a "walled garden" or the normal state of
a catalog that will not take write responsibility for tables it does not own is a matter of
taste. Snowflake's docs are the place to check how symmetric Horizon is in the other direction.
This page does not check Snowflake.
:::

**The claim.** Open-source Unity Catalog shares only a name with the Databricks product, and
most of its commits come from Databricks employees.

**The docs.** Databricks' documentation says {{entry:unity-catalog}}
[is also available as an open-source implementation](https://docs.databricks.com/aws/en/data-governance/unity-catalog/#:~:text=also%20available%20as%20an%20open%2Dsource%20implementation),
and the project's own
[README](https://github.com/unitycatalog/unitycatalog/blob/58d5c7b2867d76801dc991b055d6ea2c70d2d811/README.md)
describes it as a sandbox project of the LF AI and Data Foundation under an Apache 2.0
licence. Whether the two implementations share code is not something a documentation page
will tell you. Whether they share an API is. The open-source project's
[OpenAPI spec](https://github.com/unitycatalog/unitycatalog/blob/58d5c7b2867d76801dc991b055d6ea2c70d2d811/api/all.yaml)
serves its catalogs at the path `/api/2.1/unity-catalog/catalogs`, and the Databricks REST API
reference lists the product's
[list catalogs endpoint](https://docs.databricks.com/api/workspace/catalogs/list)
at exactly the same path. Same version prefix, same resource names for catalogs, schemas,
tables, volumes, models, credentials, and external locations. "A name and nothing else" is
not accurate: a client written against one talks to the other. How much of the code behind
that API is shared is a different question, and not one either side documents.

**The repos.** Commit shares are not in any doc, but they are in the git history, so we
measured them. The article's footnote describes its method as commit volume "by contributor
corporate domain affiliation", so we used the same proxy: the domain of each commit's author
email. We cloned
[unitycatalog/unitycatalog](https://github.com/unitycatalog/unitycatalog/tree/58d5c7b2867d76801dc991b055d6ea2c70d2d811)
and
[apache/polaris](https://github.com/apache/polaris/tree/015f6b079f6563a890bfed3aec1aacf5c4259787)
at the commits linked, both from the first week of September 2026, and counted every commit
on the default branch.

| Measure | Unity Catalog OSS | Apache Polaris |
|---|---|---|
| Commits on the default branch | 850 | 3,821 |
| Commits by dependency bots | 0 | 1,224 |
| Human commits | 850 | 2,597 |
| Distinct author addresses | 142 | 181 |
| Address hidden by GitHub noreply | 30 percent | 19 percent |
| gmail.com | 26 percent | 25 percent |
| apache.org | under 1 percent | 22 percent |
| databricks.com | 33 percent | 0 |
| snowflake.com | 0 | 3.5 percent |
| dremio.com | 0 | 2.1 percent |

Percentages are of human commits. Two readings follow. For Unity Catalog, a Databricks
address is the largest single visible domain, but it is one third of commits, not a majority.
The other two thirds are Gmail addresses and hidden addresses, which say nothing about who pays
the author. Some of those people may work at Databricks; the repo cannot tell you. "Strip away
the Databricks payroll and the community nearly disappears" is not something this data
supports, and not something it refutes.

For Polaris, the footnote's numbers do not reproduce from commit addresses at all. Snowflake
addresses are on 3.5 percent of human commits, which is close to the 7.6 percent claimed only
if you are generous. Dremio addresses are on 2.1 percent, nowhere near 38 percent. The
explanation is in the table: the two biggest human domains are Gmail and apache.org, and an
apache.org address hides the employer by design. Whatever analysis produced 38 percent mapped
people to companies by some means other than their commit address, and the footnote does not
say which. A dependency bot, meanwhile, authored almost a third of all Polaris commits, which
any "commit volume" figure has to exclude first.

:::note
Method limits, stated plainly. Author email domain is a weak proxy for employer: people commit
from personal addresses, GitHub hides addresses on request, and Apache committers get an
apache.org address that replaces their company one. We did not look up individuals to assign
them an employer, on purpose. The numbers above are what the two repositories say about
themselves on the dates linked, nothing more.
:::

**Verdict.** "A name and nothing else" does not hold; the two share the REST API. The Unity
Catalog "majority" is not supported by the repo, and the Polaris footnote does not reproduce
by the method it describes. Neither project's governance is in
question: both READMEs say Linux Foundation, Apache 2.0. Misleading on the API claim and on
the Polaris figures. The "majority" is unsupported rather than disproven.

## Security: RBAC

**The claim.** Databricks lacks a true RBAC engine, quoting "In Databricks, a role is
implemented as a group". Role assumption was introduced in 2026 as a retrofitted feature and
requires compute-context switches whenever users scope permissions.

**The docs.** The quote is exact:
[in Databricks, a role is implemented as a group](https://docs.databricks.com/aws/en/security/auth/rbac/#:~:text=In%20Databricks%2C%20a%20role%20is%20implemented%20as%20a%20group).
The dates are right too. {{entry:role-based-access-control}} entered
[Public Preview on July 22, 2026](https://docs.databricks.com/aws/en/release-notes/product/2026/july#:~:text=Role%2Dbased%20access%20control%20%28RBAC%29%20is%20now%20in%20Public%20Preview)
and became
[generally available on August 19, 2026](https://docs.databricks.com/aws/en/release-notes/product/2026/august#:~:text=Role%2Dbased%20access%20control%20%28RBAC%29%20is%20now%20generally%20available).
The behaviour matches the article's description: assuming a role replaces the user's inherited
permissions
[with only the assumed role's permissions for the session](https://docs.databricks.com/aws/en/security/auth/rbac/#:~:text=with%20only%20the%20assumed%20role%27s%20permissions%20for%20the%20session),
and
[a user can only act as one role at a time](https://docs.databricks.com/aws/en/security/auth/rbac/#:~:text=A%20user%20can%20only%20act%20as%20one%20role%20at%20a%20time).

The compute-switch claim is where the docs disagree. Users can assume a role through several
methods,
[including the role switcher in the Workspace UI](https://docs.databricks.com/aws/en/security/auth/rbac/#:~:text=including%20the%20role%20switcher%20in%20the%20Workspace%20UI),
the CLI, the API, and BI tools. A dedicated-access-mode cluster assigned to a group is one of
those methods, not the only one.

The article also says admins must "resolve workspace entitlement overlaps". We looked for
that on the RBAC limitations page. It lists unsupported features, group-management limits,
and a cap:
[workspace asset sharing controls can be applied to a maximum of 100 groups by default](https://docs.databricks.com/aws/en/security/auth/rbac/limitations#:~:text=applied%20to%20a%20maximum%20of%20100%20groups%20by%20default).
Nothing on it is called an entitlement overlap. That does not make the phrase wrong; it makes
it undocumented.

**Verdict.** The quote and the 2026 date hold. "Requires compute-context switches" does not
hold as worded. "Entitlement overlaps" is not in the docs. The quote is not misleading. The
compute-switch claim is. The overlaps phrase is unsupported. Whether a group with an Assume permission counts as a "true" role is a
definition, not a fact.

## Security: ABAC and tagging users

**The claim.** Unity Catalog only permits tags on data objects, not users or principals.
Because user tags do not exist, evaluating user attributes means hardcoding group names into
custom SQL UDF wrappers. The article asks how you can tag principals in Databricks and
answers: you can't.

**The docs.** On tags, the article is right. {{entry:governed-tags}}
[can be applied to Unity Catalog objects such as tables and catalogs](https://docs.databricks.com/aws/en/admin/governed-tags/#:~:text=Governed%20tags%20can%20be%20applied%20to%20Unity%20Catalog%20objects%20such%20as%20tables%20and%20catalogs)
and to workspace objects like dashboards and notebooks. Users are not on the list.

But the article was published on September 3, 2026, and the question it asks was answered on
August 13. {{entry:identity-attributes}} are
[a fixed set of nine attributes that Databricks stores on account users](https://docs.databricks.com/aws/en/admin/users-groups/identity-attributes/#:~:text=a%20fixed%20set%20of%20nine%20attributes%20that%20Databricks%20stores%20on%20account%20users),
synced from your identity provider: title, department, cost centre, country, and five more.
Four days later, on August 17, ABAC column mask policies gained conditions that
[target users by attributes synced from your identity provider](https://docs.databricks.com/aws/en/release-notes/product/2026/august#:~:text=target%20users%20by%20attributes%20synced%20from%20your%20identity%20provider),
and on August 21 context attributes let policies
[target the context of a request](https://docs.databricks.com/aws/en/release-notes/product/2026/august#:~:text=target%20the%20context%20of%20a%20request),
such as the calling OAuth application. That is the "golden use case" the article describes:
a user attribute evaluated against a data attribute, in one policy.

The caveats are real and worth stating plainly. All three are Beta.
[Identity attributes are supported on users only](https://docs.databricks.com/aws/en/admin/users-groups/identity-attributes/#:~:text=Identity%20attributes%20are%20supported%20on%20users%20only),
not on groups or service principals. They work in column masks, not yet in row filters. And
they are attributes, not tags, so the literal sentence "you cannot tag a user" stays true.

The UDF-wrapper part also overstates things. An {{entry:attribute-based-access-control}} policy
has a TO clause naming
[the users, groups, or service principals the policy applies to](https://docs.databricks.com/aws/en/data-governance/unity-catalog/abac/policies#:~:text=The%20users%2C%20groups%2C%20or%20service%20principals%20the%20policy%20applies%20to).
Targeting a group does not require a UDF.

**Verdict.** Partly holds. No user tags, true. No way to evaluate user attributes in a policy,
false since August 17, 2026, with Beta limits. Misleading: stale by two weeks on the point the
whole section rests on.

:::judgement
This is the section that ages worst. Snowflake's argument is that tagging principals is the
gold standard and Databricks cannot do it. Two weeks before the article, Databricks shipped the
capability in Beta. A Beta with a users-only limit is not parity. But "you can't" was already
the wrong answer on the day the article went out.
:::

## Security: differential privacy

**The claim.** Databricks has no native differential privacy policies or privacy budgets, and
leaves that layer to manual auditing or third-party tools.

**The docs.** {{entry:databricks-clean-rooms}} are described as an environment where parties
work on sensitive data
[without direct access to each other's data](https://docs.databricks.com/aws/en/clean-rooms/#:~:text=without%20direct%20access%20to%20each%20other%27s%20data).
That page does not mention differential privacy, noise, or a privacy budget. We searched the
Databricks docs for a native differential privacy policy and found nothing.

:::warning
An absence in the docs cannot be linked, so this verdict rests on a search that found nothing,
not on a sentence that says "not supported". If Databricks ships or documents such a feature,
this section is the first thing on the page to go stale.
:::

**Verdict.** Consistent with the docs, as far as we can see. Not misleading.

## Sharing: the recipient penalty

**The claim.** Delta Sharing shifts cost and complexity to the recipient: recipients bring and
pay for their own compute, often copy the data locally anyway, and multi-tier re-sharing is
restricted by rigid recipient requirements.

**The docs.** Start with the name. The article says "Delta Sharing" throughout. Databricks
renamed it: on June 10, 2026,
[Delta Sharing is now OpenSharing](https://docs.databricks.com/aws/en/release-notes/product/2026/june#:~:text=Delta%20Sharing%20is%20now%20OpenSharing).
The old name is {{entry:delta-sharing}}; the current name is {{entry:opensharing}}. Snowflake
is using a name that was three months out of date at publication. We track exactly this kind of
thing, so we notice.

On compute, the article is right. OpenSharing
[is an open protocol developed by Databricks for secure data sharing](https://docs.databricks.com/aws/en/opensharing/#:~:text=an%20open%20protocol%20developed%20by%20Databricks%20for%20secure%20data%20sharing),
and open-sharing recipients read it with their own tools. The docs give instructions for
[reading shared data using the following tools](https://docs.databricks.com/aws/en/opensharing/read-data-open#:~:text=reading%20shared%20data%20using%20the%20following%20tools):
Iceberg clients, Apache Spark, pandas, Power BI, and Tableau. Whatever runs those is the
recipient's, and the recipient pays for it.

The article also says recipients "often end up building custom ingestion pipelines to copy
the data locally anyway". That is a claim about what recipients do, not about what the
product does, and no documentation can confirm or deny it. What the docs say is that
{{entry:opensharing}} is designed so that copying is not required, below.

On egress, the article never says outright that Databricks recipients pay it. It says
Snowflake's approach means "removing egress for the consumer", which leaves the reader to
infer that the alternative does not. The Databricks docs point the other way. The egress page
is titled "for providers".
[OpenSharing does not require data replication](https://docs.databricks.com/aws/en/opensharing/#:~:text=OpenSharing%20does%20not%20require%20data%20replication),
so
[your cloud vendor may charge data egress fees when you share data across clouds or regions](https://docs.databricks.com/aws/en/opensharing/#:~:text=your%20cloud%20vendor%20may%20charge%20data%20egress%20fees%20when%20you%20share%20data%20across%20clouds%20or%20regions).
That "your" is the provider.
[OpenSharing within a region incurs no egress cost](https://docs.databricks.com/aws/en/opensharing/#:~:text=OpenSharing%20within%20a%20region%20incurs%20no%20egress%20cost).
For cross-cloud, the provider can place data where
[Cloudflare R2 object storage incurs no egress fees](https://docs.databricks.com/aws/en/opensharing/manage-egress#:~:text=Cloudflare%20R2%20object%20storage%20incurs%20no%20egress%20fees),
or use {{entry:secureconnect}}, where
[Databricks bills the data transfer rather than your cloud vendor](https://docs.databricks.com/aws/en/opensharing/manage-egress#:~:text=Databricks%20bills%20the%20data%20transfer%20rather%20than%20your%20cloud%20vendor).

On re-sharing, the docs have one rule, and it points the article's way. The create-share page
lists as a limitation that
[you cannot share views that reference shared tables or shared views](https://docs.databricks.com/aws/en/opensharing/create-share#:~:text=You%20cannot%20share%20views%20that%20reference%20shared%20tables%20or%20shared%20views).
That closes the obvious route to multi-tier sharing: receive a table, wrap it in a view, share
the view on. Whether a recipient can add a received table to a share directly is not stated
anywhere we could find, in that page, in the SQL reference for adding tables to a share, or in
the
[OpenSharing specification repo](https://github.com/OpenSharing-IO/OpenSharing/tree/ca251c87cd9e1bd741b3d81882b603788ab90d2f),
whose spec has no concept of a recipient re-sharing at all. So "restricted" is fair; how
restricted is not fully written down. What the docs also say is that a shared catalog is
read-only:
[you cannot grant privileges that give write or update access to an OpenSharing catalog](https://docs.databricks.com/aws/en/opensharing/read-data-databricks#:~:text=You%20cannot%20grant%20privileges%20that%20give%20write%20or%20update%20access%20to%20an%20OpenSharing%20catalog).

**Verdict.** Compute cost to recipients holds. The implied egress cost to recipients does not
hold; the docs put it on the provider. "They copy it anyway" is behaviour, not documentation.
Re-sharing is partly documented: views over shared data cannot be shared on, and the docs stop
there. The compute point is misleading by framing: the article's own Snowflake pitch has
consumers query "using their existing warehouses", which they also pay for. The egress
implication is misleading. "They copy it anyway" is unsupported. The re-sharing restriction is
not misleading; the one rule on record supports it.

## Continuity: managed disaster recovery

**The claim.** Databricks Managed Disaster Recovery does not replicate materialized views,
streaming tables, Lakeflow pipelines, secrets, ML models, model serving endpoints, vector
search indexes, Delta shares, published dashboards, or Structured Streaming outside Lakeflow.
Customers must recreate external locations and storage credentials in the secondary region.
After failover, SQL warehouses arrive stopped, clusters terminated, and job schedules paused.
Initial replication can take up to two weeks. Cross-cloud needs DIY scripts.

**The docs.** This is the most accurate section of the article. Every item is on the page.
Managed DR
[replicates your Databricks deployment to a secondary region](https://docs.databricks.com/aws/en/admin/managed-disaster-recovery#:~:text=replicates%20your%20Databricks%20deployment%20to%20a%20secondary%20region),
and
[you do not write or maintain replication scripts](https://docs.databricks.com/aws/en/admin/managed-disaster-recovery#:~:text=You%20do%20not%20write%20or%20maintain%20replication%20scripts).
The not-replicated list includes
[Unity Catalog and workspace secrets, ML models, model serving endpoints, vector search indexes, Delta shares](https://docs.databricks.com/aws/en/admin/managed-disaster-recovery#:~:text=Unity%20Catalog%20and%20workspace%20secrets%2C%20ML%20models%2C%20model%20serving%20endpoints%2C%20vector%20search%20indexes%2C%20Delta%20shares),
plus materialized views, streaming tables, and pipelines.
[Managed DR does not replicate external locations or storage credentials automatically](https://docs.databricks.com/aws/en/admin/managed-disaster-recovery#:~:text=Managed%20DR%20does%20not%20replicate%20external%20locations%20or%20storage%20credentials%20automatically).
[SQL warehouses are replicated in STOPPED state, clusters in TERMINATED state](https://docs.databricks.com/aws/en/admin/managed-disaster-recovery#:~:text=SQL%20warehouses%20are%20replicated%20in%20STOPPED%20state%2C%20clusters%20in%20TERMINATED%20state),
and
[job schedules in the secondary are paused](https://docs.databricks.com/aws/en/admin/managed-disaster-recovery#:~:text=Job%20schedules%20in%20the%20secondary%20are%20paused).
For large workspaces,
[the initial workspace asset bootstrap can take up to two weeks](https://docs.databricks.com/aws/en/admin/managed-disaster-recovery#:~:text=the%20initial%20workspace%20asset%20bootstrap%20can%20take%20up%20to%20two%20weeks).
The secondary must be
[on the same cloud as your primary](https://docs.databricks.com/aws/en/admin/managed-disaster-recovery#:~:text=on%20the%20same%20cloud%20as%20your%20primary),
so cross-cloud is indeed outside the product.

One sentence in the article overreaches. It says that "true cross-region or cross-cloud
resilience" requires teams to write and maintain custom synchronization scripts. Cross-cloud,
yes. Cross-region is what managed DR is: it replicates to a secondary region, and the page's
own words are that you do not write or maintain replication scripts. The gaps listed above
mean some objects still need manual work after failover, which is a fair point. "Cross-region
needs DIY scripts" is not.

Two things the article omits. First, this is a
[Public Preview since June 12, 2026](https://docs.databricks.com/aws/en/release-notes/product/2026/june#:~:text=Managed%20disaster%20recovery%20%28DR%29%20is%20now%20in%20Public%20Preview),
and
[access to managed disaster recovery is currently gated](https://docs.databricks.com/aws/en/release-notes/product/2026/june#:~:text=Access%20to%20managed%20disaster%20recovery%20is%20currently%20gated),
sold through the {{entry:mission-critical}} add-on. Comparing a gated preview to a product
Snowflake has shipped for years is fair to mention, and the article does not. Second, a small
irony for this site: the not-replicated list on Databricks' own page still says "Delta shares",
three months after Databricks renamed Delta Sharing.

**Verdict.** Holds on every listed gap. "Cross-region needs scripts" does not hold. The gap
list is accurate and not misleading. The cross-region sentence is misleading.

## Money: the consumption penalty

**The claim.** Databricks runs standard DBU consumption with minimal financial incentives to
optimise, so a faster job just earns the vendor less.

**The docs.** This is opinion, and the argument applies to any consumption model, Snowflake's
included. What the pricing page says is that Databricks offers discounts
[when you commit to certain levels of usage](https://www.databricks.com/product/pricing#:~:text=when%20you%20commit%20to%20certain%20levels%20of%20usage),
which is the same shape as the "capacity commitments" the article credits Snowflake with.

**Verdict.** Opinion. The one checkable fact, that commitment discounts exist, points the other
way. Misleading by omission.

## What to take from this

Counting the scorecard: the disaster recovery section is fully accurate, the UniForm and
compute-tuning claims are accurate about classic compute, and the RBAC quote and dates are
exact, and so is the read-only Iceberg point once "outbound" is read as "outbound writes". The
egress direction and the "you can't" on user attributes do not survive a read of the docs. The commit-share footnote does not survive a
clone of the repos. The product name is three months out of date. On the second verdict,
12 of 26 claims mislead, 2 partly, 9 do not, and 3 cannot be checked. The
misleading ones are rarely false outright. Most are true sentences about classic compute, or
about the docs as they stood a few weeks earlier, with the part that would change the reader's
mind left out.

:::judgement
If you are the data team that was handed this article, do what the article itself suggests and
pressure-test it. The links are all here. Open each one, read the sentence, and decide whether
the conclusion follows. That is the only evaluation method that does not depend on which
vendor wrote the slide.
:::
