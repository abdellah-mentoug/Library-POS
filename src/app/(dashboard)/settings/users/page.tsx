import { requireAdmin } from "@/lib/auth";
import { getUsers } from "@/lib/actions/auth-actions";
import { UsersClient } from "../_components/users-client";

export default async function UserManagementPage() {
  const currentUser = await requireAdmin();
  const users = await getUsers();

  return <UsersClient users={users} currentUserId={currentUser.id} />;
}

