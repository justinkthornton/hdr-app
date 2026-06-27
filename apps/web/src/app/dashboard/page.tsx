import DashboardClient from "../../components/DashboardClient";
import { requireAdminPage } from "../../lib/admin-page";

export default async function DashboardPage(): Promise<React.ReactElement> {
  await requireAdminPage();

  return (
    <main className="shell">
      <DashboardClient />
    </main>
  );
}
