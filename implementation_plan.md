# Implementation Plan - Commercial Proposal Features

This plan outlines the steps to implement the 3 features approved in the commercial proposal.
**Status:** Staging Implementation

## User Review Required
> [!IMPORTANT]
> This implementation requires database schema changes. A new migration file `scripts/migration_staging_features.sql` will be created.

## Proposed Changes

### Database (Supabase)
#### [NEW] [migration_staging_features.sql](file:///C:/Users/camil/OneDrive/Documentos/Andre/projetos/WGA Brasil/scripts/migration_staging_features.sql)
- **Feature 1:** Create `client_equipment_overrides` (or similar) to store custom chemical technology per client.
- **Feature 3:** Add `has_stock_access` column to `clients` table (default true).

### Feature 1: Technology Chemical customized per Client
#### [MODIFY] [ClientEquipmentManager.jsx](file:///C:/Users/camil/OneDrive/Documentos/Andre/projetos/WGA Brasil/src/components/setup/ClientEquipmentManager.jsx)
- Add a new section/modal to configure "Custom Technology" for a client's equipment.
- Allow selecting extra Products and Test Parameters that are specific to this client.

#### [MODIFY] [DosageBoardTab.jsx](file:///C:/Users/camil/OneDrive/Documentos/Andre/projetos/WGA Brasil/src/components/visit/DosageBoardTab.jsx)
- Update code to fetch "merged" configuration (Standard Equipment Config + Client Specific Config).
- Ensure new items appear in the list.

### Feature 2: Smart Readings Validation
#### [MODIFY] [ReportTab.jsx](file:///C:/Users/camil/OneDrive/Documentos/Andre/projetos/WGA Brasil/src/components/visit/ReportTab.jsx)
- **Validation Logic:** Before saving/signing, scan all expected readings.
- **Confirmation Modal:** If empty fields exist, show "Alert: The following items are empty... Proceed?".
- **PDF Generation:** Pass a flag or ensure the `pdfData` only includes captured values.

#### [MODIFY] [ReportTemplate.jsx](file:///C:/Users/camil/OneDrive/Documentos/Andre/projetos/WGA Brasil/src/components/visit/ReportTemplate.jsx)
- Implement conditional rendering to hide table rows where values are null/empty.

### Feature 3: Stock Access Control
#### [MODIFY] [ClientLocationManager.jsx](file:///C:/Users/camil/OneDrive/Documentos/Andre/projetos/WGA Brasil/src/components/setup/ClientLocationManager.jsx)
- Add "Sem Acesso ao Estoque" checkbox when editing a Client.

#### [MODIFY] [ClientInventoryManager.jsx](file:///C:/Users/camil/OneDrive/Documentos/Andre/projetos/WGA Brasil/src/components/setup/ClientInventoryManager.jsx)
- Verify `has_stock_access` flag. If false, show message "Stock access disabled for this client" and disable inputs.

#### [MODIFY] [DosageBoardTab.jsx](file:///C:/Users/camil/OneDrive/Documentos/Andre/projetos/WGA Brasil/src/components/visit/DosageBoardTab.jsx)
- Hide/Disable "Adicionar Produto" button if `has_stock_access` is false.

## Verification Plan

### Automated Tests
- Run `node scripts/test-db.cjs` to verify database connection after migration.

### Manual Verification
1.  **Stock Access:**
    - Go to Client Config, uncheck "Access to Stock".
    - Open a Visit for this client. Verify "Add Product" is disabled.
2.  **Client Tech:**
    - Go to Client Config, add a specific Test (e.g. "SpecTest") for a Boiler.
    - Open a Visit for this client's Boiler. Verify "SpecTest" appears.
    - Open a Visit for another client's Boiler. Verify "SpecTest" does NOT appear.
3.  **Validation:**
    - Start a visit, leave some fields empty.
    - Click Finish/Sign. Verify the Alert appears.
    - Confirm. Check the generated PDF. Verify empty fields are NOT shown.
