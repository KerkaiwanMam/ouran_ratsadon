-- DropIndex
DROP INDEX "BudgetLineItem_budgetaryUnit_fiscalYear_idx";

-- DropIndex
DROP INDEX "BudgetLineItem_fiscalYear_ministry_idx";

-- DropIndex
DROP INDEX "BudgetLineItem_output_idx";

-- DropIndex
DROP INDEX "BudgetLineItem_project_idx";

-- DropIndex
DROP INDEX "BudgetLineItem_refDoc_refPageNo_idx";

-- CreateIndex
CREATE INDEX "BudgetLineItem_fiscalYear_idx" ON "BudgetLineItem"("fiscalYear");

