"use client";

import { useRef, useState } from "react";
import {
  resendInvitationAction,
  setUserActiveAction,
  updateUserRoleAction,
} from "@/app/(beveiligd)/actions/user-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ListCard,
  ListCardActions,
  ListCardEmpty,
  ListCardHeader,
  ListCardRow,
  ListCardRows,
  ListCardTitle,
  ResponsiveListView,
} from "@/components/ui/responsive-list";
import { SelectMenu } from "@/components/ui/select";
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
import { UserName } from "@/components/user/user-name";
import {
  userRoleLabels,
  userRoles,
  type StaffStatus,
  type UserRole,
} from "@/lib/user-validation";

export type StaffRow = {
  id: string;
  slug: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  status: StaffStatus;
};

const statusCopy: Record<
  StaffStatus,
  { label: string; tone: "success" | "info" | "default" }
> = {
  active: { label: "Actief", tone: "success" },
  invited: { label: "Uitgenodigd", tone: "info" },
  inactive: { label: "Gedeactiveerd", tone: "default" },
};

function isUserRole(value: string): value is UserRole {
  return userRoles.includes(value as UserRole);
}

function useStaffMemberActions(user: StaffRow) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const roleFormRef = useRef<HTMLFormElement>(null);
  const status = statusCopy[user.status];
  const role = isUserRole(user.role) ? user.role : "user";

  async function run(
    key: string,
    action: (formData: FormData) => Promise<{ error?: string }>,
    formData: FormData,
  ) {
    setPending(key);
    setError(null);
    if (key === "resend") setResent(false);
    try {
      const result = await action(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (key === "resend") setResent(true);
    } catch {
      setError("Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setPending(null);
    }
  }

  async function resendInvitation() {
    const formData = new FormData();
    formData.set("userId", user.id);
    await run("resend", (data) => resendInvitationAction(null, data), formData);
  }

  const roleField = (canManage: boolean) =>
    canManage ? (
      <form
        ref={roleFormRef}
        className="max-w-full sm:max-w-40"
        action={(formData) =>
          run("role", (data) => updateUserRoleAction(null, data), formData)
        }
      >
        <input type="hidden" name="userId" value={user.id} />
        <input type="hidden" name="role" value={role} />
        <SelectMenu
          defaultValue={role}
          disabled={pending !== null}
          aria-label={`Rol van ${user.name}`}
          searchPlaceholder="Zoek een rol…"
          items={userRoles.map((value) => ({
            value,
            label: userRoleLabels[value],
          }))}
          onValueChange={(next) => {
            const form = roleFormRef.current;
            if (!form) return;
            const input = form.querySelector<HTMLInputElement>(
              'input[name="role"]',
            );
            if (input) input.value = next;
            form.requestSubmit();
          }}
        />
      </form>
    ) : (
      <Badge tone={user.role === "admin" ? "warning" : "default"}>
        {isUserRole(user.role) ? userRoleLabels[user.role] : user.role}
      </Badge>
    );

  const manageActions = (canManage: boolean, isSelf: boolean) =>
    canManage ? (
      <>
        {user.status === "invited" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            loading={pending === "resend"}
            disabled={pending !== null && pending !== "resend"}
            onClick={() => void resendInvitation()}
          >
            {resent ? "Verstuurd" : "Opnieuw uitnodigen"}
          </Button>
        ) : null}
        <form
          action={(formData) =>
            run("active", (data) => setUserActiveAction(null, data), formData)
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
            disabled={isSelf || (pending !== null && pending !== "active")}
          >
            {user.status === "inactive" ? "Activeren" : "Deactiveren"}
          </Button>
        </form>
      </>
    ) : null;

  return {
    error,
    status,
    roleField,
    manageActions,
  };
}

function StaffMemberTableRow({
  user,
  isSelf,
  canManage,
}: {
  user: StaffRow;
  isSelf: boolean;
  canManage: boolean;
}) {
  const { error, status, roleField, manageActions } = useStaffMemberActions(user);

  return (
    <TableRow>
      <TableCell>
        <span className="inline-flex min-w-0 items-center gap-2">
          <UserName
            name={user.name}
            image={user.image}
            slug={user.slug}
            size="sm"
            className="font-medium"
          />
          {isSelf ? (
            <span className="text-xs text-fg-muted">Jij</span>
          ) : null}
        </span>
        {error ? (
          <p className="mt-1 text-xs text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </TableCell>
      <TableCell className="text-fg-muted">{user.email}</TableCell>
      <TableCell>{roleField(canManage)}</TableCell>
      <TableCell>
        <Badge tone={status.tone}>{status.label}</Badge>
      </TableCell>
      {canManage ? (
        <TableCell align="right">
          <div className="flex flex-wrap justify-end gap-1">
            {manageActions(canManage, isSelf)}
          </div>
        </TableCell>
      ) : null}
    </TableRow>
  );
}

function StaffMemberCard({
  user,
  isSelf,
  canManage,
}: {
  user: StaffRow;
  isSelf: boolean;
  canManage: boolean;
}) {
  const { error, status, roleField, manageActions } = useStaffMemberActions(user);

  return (
    <ListCard>
      <ListCardHeader>
        <div className="min-w-0">
          <ListCardTitle>
            <UserName
              name={user.name}
              image={user.image}
              slug={user.slug}
              size="sm"
              className="font-medium"
            />
            {isSelf ? (
              <span className="ml-2 text-xs font-normal text-fg-muted">
                Jij
              </span>
            ) : null}
          </ListCardTitle>
          {error ? (
            <p className="mt-1 text-xs text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </ListCardHeader>
      <ListCardRows>
        <ListCardRow label="E-mail">{user.email}</ListCardRow>
        <ListCardRow label="Rol">{roleField(canManage)}</ListCardRow>
      </ListCardRows>
      {canManage ? (
        <ListCardActions>{manageActions(canManage, isSelf)}</ListCardActions>
      ) : null}
    </ListCard>
  );
}

export function StaffTable({
  users,
  currentUserId,
  canManage,
  emptyMessage = "Nog geen teamleden.",
}: {
  users: StaffRow[];
  currentUserId: string;
  canManage: boolean;
  emptyMessage?: string;
}) {
  const desktop = (
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
              {emptyMessage}
            </TableEmptyRow>
          ) : (
            users.map((user) => (
              <StaffMemberTableRow
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

  const mobile =
    users.length === 0 ? (
      <ListCardEmpty>{emptyMessage}</ListCardEmpty>
    ) : (
      users.map((user) => (
        <StaffMemberCard
          key={user.id}
          user={user}
          isSelf={user.id === currentUserId}
          canManage={canManage}
        />
      ))
    );

  return <ResponsiveListView desktop={desktop} mobile={mobile} />;
}
