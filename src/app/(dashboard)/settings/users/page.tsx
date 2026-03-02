import { requireAdmin } from "@/lib/auth";
import { getUsers } from "@/lib/actions/auth-actions";
import { UsersClient } from "../_components/users-client";

export default async function UserManagementPage() {
  const currentUser = await requireAdmin();
  const users = await getUsers();

  return (
    <div className="space-y-4">
      <UsersClient users={users} currentUserId={currentUser.id} />
    </div>
  );
}
