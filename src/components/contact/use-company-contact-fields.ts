"use client";

import { useRef, useState } from "react";
import { listContactsForSelectAction } from "@/app/(beveiligd)/actions/contact-actions";
import {
  getContactCompanyId,
  contactBelongsToCompany,
} from "@/lib/contact-company";

export type CompanyContactOption = {
  id: string;
  firstName: string;
  lastName: string | null;
  companyId: string | null;
};

const COMPANY_SWITCH_WARNING =
  "Het gekozen contact hoort niet bij dit bedrijf. Het contactveld wordt geleegd.";

export function useCompanyContactFields({
  initialCompanyId,
  initialContactId,
  initialContacts,
}: {
  initialCompanyId?: string | null;
  initialContactId?: string | null;
  initialContacts: CompanyContactOption[];
}) {
  const [companyId, setCompanyId] = useState(initialCompanyId ?? "");
  const [contactId, setContactId] = useState(initialContactId ?? "");
  const [contacts, setContacts] = useState(initialContacts);
  const [contactsLoading, setContactsLoading] = useState(false);
  const requestId = useRef(0);

  function loadContacts(nextCompanyId: string) {
    const id = ++requestId.current;
    setContactsLoading(true);
    listContactsForSelectAction(nextCompanyId || null)
      .then((rows) => {
        if (id !== requestId.current) return;
        setContacts(rows);
      })
      .finally(() => {
        if (id === requestId.current) setContactsLoading(false);
      });
  }

  function onContactChange(nextContactId: string) {
    setContactId(nextContactId);
    const selected = contacts.find((contact) => contact.id === nextContactId);
    const nextCompanyId = getContactCompanyId(selected);
    if (nextCompanyId && nextCompanyId !== companyId) {
      setCompanyId(nextCompanyId);
      loadContacts(nextCompanyId);
      return nextCompanyId;
    }
    return companyId;
  }

  function onCompanyChange(nextCompanyId: string) {
    const selected = contacts.find((contact) => contact.id === contactId);
    if (
      contactId &&
      selected &&
      nextCompanyId &&
      !contactBelongsToCompany(selected, nextCompanyId)
    ) {
      if (!window.confirm(COMPANY_SWITCH_WARNING)) return null;
      setContactId("");
    }
    setCompanyId(nextCompanyId);
    loadContacts(nextCompanyId);
    return nextCompanyId;
  }

  return {
    companyId,
    contactId,
    contacts,
    contactsLoading,
    onCompanyChange,
    onContactChange,
  };
}
