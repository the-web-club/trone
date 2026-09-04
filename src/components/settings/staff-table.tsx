"use client";

import { useState } from "react";
import {
  resendInvitationAction,
  setUserActiveAction,
  updateUserRoleAction,
} from "@/app/(beveiligd)/actions/user-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableEmptyRow,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import {
  userRoleLabels,
  userRoles,
  type StaffStatus,
  type UserRole,
} from "@/lib/user-validation";

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: StaffStatus;
};

const statusCopy: Record<StaffStatus, { label: string; tone: "success" | "info" | "default" }> = {
  active: { label: "Actief", tone: "success" },
  invited: { label: "Uitgenodigd", tone: "info" },
  inactive: { label: "Gedeactiveerd", tone: "default" },
};

function isUserRole(value: string): value is UserRole {
  return userRoles.includes(value as UserRole);
}

export function StaffTable({
  users,
  currentUserId,
  canManage,
}: {
  users: StaffRow[];
  currentUserId: string;
  canManage: boolean;
}) {
  return (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Naam</TableHeaderCell>
            <TableHeaderCell>E-mail</TableHeaderCell>
            <TableHeaderCell>Rol</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            {canManage ? <TableHeaderCell /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableEmptyRow colSpan={canManage ? 5 : 4}>
              Nog geen medewerkers.
            </TableEmptyRow>
          ) : (
            users.map((user) => (
              <StaffRowActions
                key={user.id}
                user={user}
                isSelf={user.id === currentUserId}
                canManage={canManage}
              />
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function StaffRowActions({
  user,
  isSelf,
  canManage,
}: {
  user: StaffRow;
  isSelf: boolean;
  canManage: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const status = statusCopy[user.status];
  const role = isUserRole(user.role) ? user.role : "user";

  async function run(
    key: string,
    action: (formData: FormData) => Promise<{ error?: string }>,
    formData: FormData,
  ) {
    setPending(key);
    setError(null);
    const result = await action(formData);
    setPending(null);
    if (result.error) setError(result.error);
  }

  return (
    <TableRow>
      <TableCell>
        <span className="font-medium">{user.name}</span>
        {isSelf ? (
          <span className="ml-2 text-xs text-fg-muted">Jij</span>
        ) : null}
        {error ? (
          <p className="mt-1 text-xs text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </TableCell>
      <TableCell className="text-fg-muted">{user.email}</TableCell>
      <TableCell>
        {canManage ? (
          <form
            className="max-w-40"
            action={(formData) =>
              run("role", (data) => updateUserRoleAction(null, data), formData)
            }
          >
            <input type="hidden" name="userId" value={user.id} />
            <Select
              name="role"
              defaultValue={role}
              disabled={pending !== null}
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
              aria-label={`Rol van ${user.name}`}
            >
              {userRoles.map((value) => (
                <option key={value} value={value}>
                  {userRoleLabels[value]}
                </option>
              ))}
            </Select>
          </form>
        ) : (
          <span className="text-fg-muted">
            {isUserRole(user.role) ? userRoleLabels[user.role] : user.role}
          </span>
        )}
      </TableCell>
      <TableCell>
        <Badge tone={status.tone}>{status.label}</Badge>
      </TableCell>
      {canManage ? (
        <TableCell align="right">
          <div className="flex flex-wrap justify-end gap-1">
            {user.status === "invited" ? (
              <form
                action={(formData) =>
                  run(
                    "resend",
                    (data) => resendInvitationAction(null, data),
                    formData,
                  )
                }
              >
                <input type="hidden" name="userId" value={user.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  loading={pending === "resend"}
                  disabled={pending !== null && pending !== "resend"}
                >
                  Opnieuw uitnodigen
                </Button>
              </form>
            ) : null}
            <form
              action={(formData) =>
                run(
                  "active",
                  (data) => setUserActiveAction(null, data),
                  formData,
                )
              }
            >
              <input type="hidden" name="userId" value={user.id} />
              <input
                type="hidden"
                name="isActive"
                value={user.status === "inactive" ? "true" : "false"}
              />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                loading={pending === "active"}
                disabled={
                  isSelf || (pending !== null && pending !== "active")
                }
              >
                {user.status === "inactive" ? "Activeren" : "Deactiveren"}
              </Button>
            </form>
          </div>
        </TableCell>
      ) : null}
    </TableRow>
  );
}
