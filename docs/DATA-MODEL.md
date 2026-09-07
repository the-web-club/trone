# Datamodel — koppelingen bedrijf / contact / lead

Kort overzicht van de huidige relaties. Geen vervanging van `prisma/schema.prisma`.

## Contact → bedrijf: nu 1:1

Een contact hoort bij hoogstens één bedrijf via `Contact.companyId`.

Leads (`Deal`), offertes en orders mogen een contact alleen koppelen als dat
contact bij hetzelfde bedrijf hoort:

`getContactCompanyId(contact) === deal.companyId` (of offerte/order).

Die regel staat in `src/lib/contact-company.ts` (`assertContactBelongsToCompany`)
en wordt afgedwongen in `createDeal` / `updateDeal` en `assertQuoteRelations`.
Orders nemen bedrijf + contact over van de offerte.

## Uitbreidpunt many-to-many (niet gebouwd)

Later kan een koppeltabel `ContactCompany` komen. Wijzig dan **alleen**:

1. `src/lib/contact-company.ts` — `getContactCompanyId` / `getContactCompany`
   (welk bedrijf hoort bij dit contact in deze context).
2. `listContactsForSelect` in `src/lib/contact-service.ts` — contacten van één
   bedrijf (de inverse lookup).

Niet overal `contact.companyId` opnieuw uitlezen.
