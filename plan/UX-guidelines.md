Thank you for the clear directions. Limiting the file target to 50–100MB, relying on URL-compressed state sharing, focusing on a graph-first workspace with live data previews, and establishing code-overrides as a fast-follow feature narrows the scope perfectly.

Below is the comprehensive UX/UI Architecture Guide for **TransformStudio**, mapped directly to `README.md` specification requirements.

---

# TransformStudio: UX/UI Architecture Guide

## 1. Design System & Principles

To appeal to data analysts, analytics engineers, and data engineers, the interface must mirror modern development environments: dense, high-utility, predictable, and performance-oriented.

* **Color Palette:** Monochromatic dark/light modes with highly specific functional accents.
* *Canvas Background:* Slate grey (`#0F172A` / `#F8FAFC`) with an interactive grid matrix.
* *Data/Node Accents:* Emerald Green (`#10B981`) for successful executions, Amber (`#F59E0B`) for stale or unexecuted nodes, and Crimson (`#EF4444`) for compilation or Pyodide memory faults.


* **Typography:** System-native monospace families (`SF Mono`, `Fira Code`, `JetBrains Mono`) for data tables and code blocks; clean sans-serif (`Inter`) for tooltips and node parameters.
* **Affordance System:** Connection points (ports) on nodes dynamically illuminate when a compatible edge is dragged near them, enforcing valid data schemas before the edge is dropped.

---

## 2. Global Workspace Layout Layout Blueprint

The workspace is organized into a rigid three-panel grid system maximizing horizontal visual real estate.

```
+---------------------------------------------------------------------------------------------------+
|  [T] TransformStudio          (v) Pipeline v3  [Share Link] [Export Code] [Memory: 42MB/512MB]    |
+---------------------------------------------------------------------------------------------------+
|               |                                                                   |               |
|               |  [Canvas Workspace]                                               | [Data Profile]|
| [Node Library]|                                                                   |               |
|               |     +-------------------+          +-------------------+          | * Row Count   |
| * File Input  |     | CSV Load: data.csv|          | Filter Rows       |          |   10,000 (DS) |
| * Filter      |     | [out_df] ---------X--------->X [in_df]   [out_df]|          |               |
| * Join        |     +-------------------+          +-------------------+          | * Nulls: 0.4% |
| * GroupBy     |                                                                   | * Schema      |
| * Sort        |                                                                   |   - ID (int)  |
|               |                                                                   |   - Rev (flt) |
|               |                                                                   |               |
+---------------+-------------------------------------------------------------------+---------------+
| [Live Preview Data Table]  (X) Downsampled Preview Active (Showing first 10,000 rows)             |
| +------------+------------+------------+------------+------------+------------+-----------------+ |
| | index      | country    | revenue    | date       | order_id   | status     |                 | |
| +------------+------------+------------+------------+------------+------------+-----------------+ |
| | 0          | US         | 1200.50    | 2026-06-01 | TX-9081    | completed  |                 | |
| | 1          | CA         | 450.00     | 2026-06-02 | TX-9082    | pending    |                 | |
+---------------+------------+------------+------------+------------+------------+-----------------+

```

### Layout Breakdown

1. **Top Navigation Bar:** Persistent utility strip displaying file metadata, historical state versioning, execution status, memory ceiling warnings, and dominant primary action triggers (`Share`, `Export Code`).


2. **Left Toolbar (Node Library):** A searchable drawer containing structural, categorical, and analytical node primitives. Elements are dragged directly from here onto the center canvas.


3. **Center Node Canvas:** A zoomable, pannable infinity graph. Nodes contain distinct input/output schema parameters. Active selection here dictates what populates the bottom data table.
4. **Right Sidebar (Contextual Inspector & Data Profile):** Dynamically updates based on the selected node. Displays column data type distribution, null value densities, and generated read-only Python code.


5. **Bottom Panel (Live Interactive Data Table):** Houses the scrollable preview data of the *currently selected* node step. Permanently displays a prominent visual warning indicator highlighting downsampling thresholds.

---

## 3. High-Fidelity UI Screens (ASCII Wireframes)

### Screen 1: File Ingestion & Auto-Downsampling Warning (Flow A)

Triggered immediately upon dragging a CSV file onto the workspace canvas.

```
+---------------------------------------------------------------------------------------------------+
| [T] TransformStudio           Untitled Pipeline *                              [Share] [Export]   |
+---------------------------------------------------------------------------------------------------+
|  [Library]   |                                                                                    |
|  Search...   |    +-----------------------------------------+                                     |
|  [-] Input   |    |  (o) CSV Ingestion Node                 |                                     |
|  > File Load |    |  File: customers_large.csv (84.3 MB)    |                                     |
|              |    |  Output Port: [out_df] -----------------|---> [Drag edge to connect...]       |
|  [-] Transform|    +-----------------------------------------+                                     |
|  > Filter    |                                                                                    |
|  > Join      |                                                                                    |
+--------------+------------------------------------------------------------------------------------+
| [Live Preview Table]  [!] NOTICE: File exceeds 50MB. Preview downsampled to first 10,000 rows.     |
| +---------+--------------+---------------+--------------+-----------------------------------------+
| | index   | customer_id  | signup_country| total_spend  | email_verified                          |
| +---------+--------------+---------------+--------------+-----------------------------------------+
| | 0       | CUST-001     | US            | 1450.25      | True                                    |
| | 1       | CUST-002     | DE            | 92.00        | False                                   |
| | 2       | CUST-003     | US            | 310.50       | True                                    |
+---------+--------------+---------------+--------------+-----------------------------------------+

```

---

### Screen 2: Multi-Node Transformation Assembly (Flow B)

Demonstrates linking sequential functional logic transformations together via a unified data flow dependency network.

```
+---------------------------------------------------------------------------------------------------+
| [T] TransformStudio           Revenue Pipeline v1                              [Share] [Export]   |
+---------------------------------------------------------------------------------------------------+
|  [Library]   |                                                                                    |
|  [-] Transform|   +---------------+        +-------------------------+      +-------------------+ |
|  > Filter    |   | CSV Load      |        | Filter Rows             |      | GroupBy           | |
|  > Join      |   | [out_df] -----|------->| [in_df]         [out_df]|------|>[in_df]   [out_df]| |
|  > GroupBy   |   +---------------+        | Rule: country == "US"   |      +-------------------+ |
|  > Sort      |                            +-------------------------+        * Selected Node     |
+--------------+------------------------------------------------------------------------------------+
| [Live Preview: GroupBy Node Output] Showing transformation state resulting from grouped arrays     |
| +---------+-----------------------+-----------------------+---------------------------------------+
| | index   | signup_country        | mean_total_spend      | customer_count                        |
| +---------+-----------------------+-----------------------+---------------------------------------+
| | 0       | US                    | 884.12                | 42100                                 |
+---------+-----------------------+-----------------------+---------------------------------------+

```

---

### Screen 3: Zero-Infrastructure Contextual Sharing Modal (Flow C)

Demonstrates URL-level compression states without a remote datastore engine dependencies.

```
+---------------------------------------------------------------------------------------------------+
| [T] TransformStudio           Revenue Pipeline v1                              [Share] [Export]   |
+---------------------------------------------------------------------------------------------------+
|              |                                                                                    |
|              |      +---------------------------------------------------------------------+       |
|              |      | Share Workflow Pipeline                                         [X] |       |
|              |      +---------------------------------------------------------------------+       |
|              |      | Your entire workflow configuration has been successfully            |       |
|              |      | compressed and encoded directly inside the share link target URL.   |       |
|              |      | [!] Crucial Note: Raw dataset file assets are never sent to server. |       |
|              |      |                                                                     |       |
|              |      |  https://transform.studio/w/#gz=H4sICG6u_1wCA3dvcmtmbG93...        |       |
|              |      |                                                                     |       |
|              |      |  [ Copy Shareable URL Link ]            [ Close Overlay Window ]    |       |
|              |      +---------------------------------------------------------------------+       |
|              |                                                                                    |
+--------------+------------------------------------------------------------------------------------+
| [Live Preview Data Table]                                                                         |
+---------------------------------------------------------------------------------------------------+

```

---

## 4. Key User Interactions & States

### Node States Matrix

To communicate pipeline validity instantly without overwhelming user logs, nodes map across 4 strict visual states:

```
+-----------------------+     +-----------------------+     +-----------------------+
|   Unconfigured Node   |     |     Executing Node    |     |    Successful Node    |
|                       |     |                       |     |                       |
| ( ) Filter Rows       |     | (o) Filter Rows       |     | (x) Filter Rows       |
| [!] Define parameters |     | [~] Running Pyodide.. |     | [*] Complete (0.12s)  |
+-----------------------+     +-----------------------+     +-----------------------+
  (Border: Dashed Grey)          (Border: Pulsing Amber)       (Border: Solid Emerald)

```

* **Error State:** If Pyodide execution fails due to a structural schema violation (e.g., trying to average a string text column), the node turns crimson (`#EF4444`) and exposes a clickable context link directly targeting the broken parameter field layer.

### The Downsampling User Interaction Flow

1. User drops a massive `90MB` file footprint onto the browser app layer.


2. A temporary blocking micro-modal alert states: *"Large dataset detected (90MB). TransformStudio will restrict visual grid layouts to the top 10,000 data rows to maintain rapid client performance. Downstream production code exports will always process full datasets."*

3. The live workspace grid initializes instantly. A permanent, persistent golden badge header sits immediately above the row grid displaying: `Downsampled Matrix Active`.

### Parameter Assignment Operations (Flow D)

When assigning variables within a node input parameters UI row (e.g., setting a conditional check expression), wrapping data attributes inside curly brackets `{}` instantly triggers token categorization:

```
+------------------------------------------------------+
| Filter Configuration Parameter Panel                 |
+------------------------------------------------------+
| Field Parameter Check:                               |
| Row Data Filter Expression: [ country == {p_country} ]|
|                                                      |
| [+] System Alert: Parameter Variable identified!     |
| Please assign default validation state context:      |
| Default Input Type: [ Text Input Block   (v) ]       |
| Initial Fallback Value: [ "US"                     ] |
+------------------------------------------------------+

```

---

## 5. Implementation Notes & Technical Constraints

* **Memory Management Guardrails:** Since compilation steps take place fully inside local application tab instances, multiple storage arrays can trigger sudden system context crashes. The persistent navigation tracker monitors Pyodide sandbox environment sizes via the `performance.memory` Web API profile whenever possible, warning users as usage approaches a hard `512MB` barrier.
* **Parsing State Deserialization:** Shared browser links unpack workflow logic states utilizing client-side base64 GZIP decompression engines (`pako` / `fflate` formats) directly embedded within root paths. If a loaded flow definition structure references dynamic node models that are missing from a local version manifest file, the workbench flags parsing omissions instantly while attempting a best-effort structural pipeline fallback render.