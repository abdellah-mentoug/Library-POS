'use client';
// src/app/(dashboard)/settings/_components/user-table.tsx
// REPLACE the existing file entirely. Adds stock_operator badge.

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Pencil, UserX, UserCheck } from 'lucide-react';
import { updateProfile } from '@/lib/actions/auth-actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const ROLE_BADGES: Record<string, { label: string; className: string }> = {
  admin:          { label: 'Admin',          className: 'bg-red-100 text-red-700 border-red-300' },
  employee:       { label: 'Employé',        className: 'bg-blue-100 text-blue-700 border-blue-300' },
  stock_operator: { label: 'Vendeur/Stock',  className: 'bg-teal-100 text-teal-700 border-teal-300' },
};

interface User {
  id: string;
  full_name: string;
  email?: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface Props {
  users: User[];
  currentUserId: string;
  onEdit: (user: User) => void;
}

export function UserTable({ users, currentUserId, onEdit }: Props) {
  const router = useRouter();

  async function toggleActive(user: User) {
    if (user.id === currentUserId) { toast.error('Impossible de désactiver votre propre compte'); return; }
    const result = await updateProfile(user.id, { is_active: !user.is_active });
    if (result.success) {
      toast.success(user.is_active ? 'Compte désactivé' : 'Compte activé');
      router.refresh();
    } else {
      toast.error((result as { error: string }).error);
    }
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Créé le</TableHead>
            <TableHead className="text-end">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => {
            const roleCfg = ROLE_BADGES[u.role] ?? { label: u.role, className: '' };
            return (
              <TableRow key={u.id} className={!u.is_active ? 'opacity-50' : ''}>
                <TableCell className="font-medium">{u.full_name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{u.email ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={roleCfg.className}>{roleCfg.label}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={u.is_active ? 'default' : 'secondary'}>
                    {u.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(u.created_at), 'dd/MM/yyyy')}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(u)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(u)}
                      disabled={u.id === currentUserId}>
                      {u.is_active
                        ? <UserX className="h-4 w-4 text-destructive" />
                        : <UserCheck className="h-4 w-4 text-green-600" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
