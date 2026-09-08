import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { QuotePdfLogo } from "@/components/quote/quote-pdf-logo";
import { formatEuroExact } from "@/lib/format";
import {
  letterheadAddressLines,
  letterheadContactLines,
  letterheadLegalParts,
} from "@/lib/letterhead";
import type { QuotePdfSelection, QuotePdfView } from "@/lib/quote-pdf-data";

const colors = {
  brand: "#35353c",
  accent: "#ed7845",
  ink: "#0a0a0a",
  muted: "#737373",
  faint: "#a3a3a3",
  line: "#e5e5e5",
  paper: "#ffffff",
};

const COL_QTY = 48;
const COL_AMT = 88;

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter Tight",
    fontSize: 9,
    fontWeight: 400,
    color: colors.ink,
    backgroundColor: colors.paper,
    paddingTop: 0,
    paddingBottom: 40,
    paddingHorizontal: 0,
  },
  header: {
    backgroundColor: colors.brand,
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  docKind: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: 400,
    marginBottom: 2,
  },
  docNumber: {
    color: colors.paper,
    fontSize: 13,
    fontWeight: 500,
  },
  accent: {
    height: 2,
    backgroundColor: colors.accent,
  },
  body: {
    paddingHorizontal: 36,
    paddingTop: 22,
  },
  parties: {
    flexDirection: "row",
    gap: 28,
    marginBottom: 18,
  },
  party: {
    flex: 1,
  },
  partyName: {
    fontSize: 10,
    fontWeight: 500,
    marginBottom: 3,
  },
  partyLine: {
    color: colors.muted,
    fontSize: 9,
    lineHeight: 1.45,
  },
  meta: {
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  metaLabel: {
    width: 88,
    color: colors.muted,
  },
  metaValue: {
    flexGrow: 1,
  },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 0.75,
    borderBottomColor: colors.ink,
    paddingBottom: 4,
    marginBottom: 6,
  },
  thDesc: {
    flexGrow: 1,
    flexShrink: 1,
    color: colors.muted,
  },
  thQty: {
    width: COL_QTY,
    textAlign: "right",
    color: colors.muted,
  },
  thAmt: {
    width: COL_AMT,
    textAlign: "right",
    color: colors.muted,
  },
  item: {
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 3,
  },
  itemTitle: {
    flexGrow: 1,
    flexShrink: 1,
    fontSize: 10,
    fontWeight: 500,
    paddingRight: 8,
  },
  qty: {
    width: COL_QTY,
    textAlign: "right",
  },
  amt: {
    width: COL_AMT,
    textAlign: "right",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingLeft: 10,
    marginBottom: 1,
  },
  optionTextPaid: {
    flexGrow: 1,
    flexShrink: 1,
    color: colors.muted,
    fontSize: 8,
    paddingRight: 8,
  },
  optionTextIncluded: {
    flexGrow: 1,
    flexShrink: 1,
    color: colors.faint,
    fontSize: 8,
    paddingRight: 8,
  },
  optionAmt: {
    width: COL_AMT,
    textAlign: "right",
    color: colors.muted,
    fontSize: 8,
  },
  optionAmtFaint: {
    width: COL_AMT,
    textAlign: "right",
    color: colors.faint,
    fontSize: 8,
  },
  itemBody: {
    flexGrow: 1,
    flexShrink: 1,
    color: colors.muted,
    fontSize: 8,
    fontWeight: 400,
    lineHeight: 1.4,
    paddingRight: 8,
    paddingLeft: 0,
    marginBottom: 2,
  },
  totals: {
    marginTop: 8,
    marginLeft: "auto",
    width: 230,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
    color: colors.muted,
  },
  totalGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 0.75,
    borderTopColor: colors.ink,
    fontSize: 10,
    fontWeight: 500,
    color: colors.ink,
  },
  notes: {
    marginTop: 16,
    color: colors.muted,
    lineHeight: 1.45,
  },
  footnote: {
    marginTop: 14,
    color: colors.muted,
    fontSize: 8,
  },
  footer: {
    position: "absolute",
    left: 36,
    right: 36,
    bottom: 16,
    borderTopWidth: 0.5,
    borderTopColor: colors.line,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    color: colors.faint,
    fontSize: 8,
  },
});

function optionAmount(selection: QuotePdfSelection): string | null {
  if (selection.priceOnRequest) return "op aanvraag *";
  if (selection.priceDelta > 0) return formatEuroExact(selection.priceDelta);
  return null;
}

export function QuotePdfDocument({ view }: { view: QuotePdfView }) {
  const sellerName = view.letterhead.name;
  const sellerAddress = letterheadAddressLines(view.letterhead);
  const sellerContact = letterheadContactLines(view.letterhead);
  const legal = letterheadLegalParts(view.letterhead);
  const hasSeller =
    Boolean(sellerName) || sellerAddress.length > 0 || sellerContact.length > 0;

  return (
    <Document
      title={view.documentTitle}
      author={sellerName || undefined}
      subject={view.documentTitle}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <QuotePdfLogo width={118} />
          <View style={styles.headerRight}>
            <Text style={styles.docKind}>Offerte</Text>
            <Text style={styles.docNumber}>{view.quoteNumber}</Text>
          </View>
        </View>
        <View style={styles.accent} fixed />

        <View style={styles.body}>
          <View style={styles.parties}>
            <View style={styles.party}>
              {hasSeller ? (
                <>
                  {sellerName ? (
                    <Text style={styles.partyName}>{sellerName}</Text>
                  ) : null}
                  {sellerAddress.map((line) => (
                    <Text key={line} style={styles.partyLine}>
                      {line}
                    </Text>
                  ))}
                  {sellerContact.map((line) => (
                    <Text key={line} style={styles.partyLine}>
                      {line}
                    </Text>
                  ))}
                </>
              ) : null}
            </View>
            <View style={styles.party}>
              <Text style={styles.partyName}>{view.customer.name}</Text>
              {view.customer.contactName ? (
                <Text style={styles.partyLine}>
                  t.a.v. {view.customer.contactName}
                </Text>
              ) : null}
              {view.customer.addressLines.map((line) => (
                <Text key={line} style={styles.partyLine}>
                  {line}
                </Text>
              ))}
              {view.customer.vatNumber ? (
                <Text style={styles.partyLine}>
                  Btw {view.customer.vatNumber}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.meta}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Offertenummer</Text>
              <Text style={styles.metaValue}>{view.quoteNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Datum</Text>
              <Text style={styles.metaValue}>{view.createdAt}</Text>
            </View>
            {view.validUntil ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Geldig tot</Text>
                <Text style={styles.metaValue}>{view.validUntil}</Text>
              </View>
            ) : null}
            {view.versionNumber > 1 ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Versie</Text>
                <Text style={styles.metaValue}>{view.versionNumber}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.tableHead}>
            <Text style={styles.thDesc}>Omschrijving</Text>
            <Text style={styles.thQty}>Aantal</Text>
            <Text style={styles.thAmt}>Bedrag</Text>
          </View>

          {view.items.map((item, index) => (
            <View key={`${item.title}-${index}`} style={styles.item} wrap={false}>
              <View style={styles.itemRow}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.qty}>
                  {item.isCustom ? "" : item.quantity}
                </Text>
                <Text style={styles.amt}>
                  {item.hasPrice ? formatEuroExact(item.lineTotal) : ""}
                </Text>
              </View>
              {item.body ? (
                <View style={styles.itemRow}>
                  <Text style={styles.itemBody}>{item.body}</Text>
                  <Text style={styles.qty} />
                  <Text style={styles.amt} />
                </View>
              ) : null}
              {item.selections.map((selection) => {
                const paid =
                  selection.priceOnRequest || selection.priceDelta > 0;
                const amount = optionAmount(selection);
                return (
                  <View
                    key={`${selection.name}-${selection.value}`}
                    style={styles.optionRow}
                  >
                    <Text
                      style={
                        paid ? styles.optionTextPaid : styles.optionTextIncluded
                      }
                    >
                      {selection.name}: {selection.value}
                    </Text>
                    <Text style={styles.qty} />
                    <Text
                      style={paid ? styles.optionAmt : styles.optionAmtFaint}
                    >
                      {amount ?? ""}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}

          <View style={styles.totals} wrap={false}>
            <View style={styles.totalRow}>
              <Text>Subtotaal</Text>
              <Text>{formatEuroExact(view.subtotal)}</Text>
            </View>
            {view.discountTotal > 0 ? (
              <View style={styles.totalRow}>
                <Text>Korting</Text>
                <Text>− {formatEuroExact(view.discountTotal)}</Text>
              </View>
            ) : null}
            <View style={styles.totalRow}>
              <Text>Totaal excl. btw</Text>
              <Text>{formatEuroExact(view.totalExVat)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>{view.vatLabel}</Text>
              <Text>{formatEuroExact(view.vatAmount)}</Text>
            </View>
            <View style={styles.totalGrand}>
              <Text>Totaal incl. btw</Text>
              <Text>{formatEuroExact(view.totalInclVat)}</Text>
            </View>
          </View>

          {view.notes ? <Text style={styles.notes}>{view.notes}</Text> : null}

          {view.hasOnRequest ? (
            <Text style={styles.footnote}>* Prijs op aanvraag.</Text>
          ) : null}
        </View>

        <View style={styles.footer} fixed>
          <Text>{legal.join("  ·  ")}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              totalPages > 1 ? `${pageNumber} / ${totalPages}` : ""
            }
          />
        </View>
      </Page>
    </Document>
  );
}
