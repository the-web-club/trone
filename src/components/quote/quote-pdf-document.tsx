import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { QuotePdfLogo } from "@/components/quote/quote-pdf-logo";
import { formatEuroExact } from "@/lib/format";
import type { QuotePdfView } from "@/lib/quote-pdf-data";

const colors = {
  brand: "#35353c",
  accent: "#ed7845",
  ink: "#0a0a0a",
  muted: "#525252",
  line: "#e5e5e5",
  paper: "#ffffff",
  sunk: "#fafafa",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter Tight",
    fontSize: 9,
    color: colors.ink,
    backgroundColor: colors.paper,
    paddingBottom: 48,
  },
  header: {
    backgroundColor: colors.brand,
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerMeta: {
    alignItems: "flex-end",
  },
  kicker: {
    color: colors.accent,
    fontSize: 8,
    fontWeight: 600,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  headerTitle: {
    color: colors.paper,
    fontSize: 16,
    fontWeight: 500,
    letterSpacing: -0.3,
  },
  headerSub: {
    color: "#d0d0d4",
    fontSize: 8,
    marginTop: 3,
  },
  accent: {
    height: 3,
    backgroundColor: colors.accent,
  },
  body: {
    paddingHorizontal: 28,
    paddingTop: 18,
  },
  parties: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 16,
  },
  party: {
    flex: 1,
  },
  label: {
    fontSize: 7.5,
    fontWeight: 600,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 4,
  },
  partyName: {
    fontSize: 11,
    fontWeight: 500,
    marginBottom: 2,
  },
  partyLine: {
    color: colors.muted,
    lineHeight: 1.4,
  },
  meta: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
    paddingVertical: 8,
    marginBottom: 16,
  },
  metaCell: {
    flex: 1,
  },
  item: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  itemHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 6,
  },
  itemTitle: {
    fontSize: 10,
    fontWeight: 500,
    flexGrow: 1,
    flexShrink: 1,
  },
  itemSku: {
    color: colors.muted,
    fontSize: 8,
    marginTop: 1,
  },
  itemPrice: {
    fontSize: 9,
    textAlign: "right",
  },
  selections: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
  },
  selection: {
    width: "49%",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    paddingVertical: 1,
  },
  selectionName: {
    color: colors.muted,
    flexShrink: 1,
  },
  selectionValue: {
    fontWeight: 500,
    textAlign: "right",
    flexShrink: 1,
  },
  onRequest: {
    marginTop: 4,
    color: colors.accent,
    fontSize: 8,
  },
  totals: {
    marginTop: 8,
    marginLeft: "auto",
    width: 220,
    backgroundColor: colors.sunk,
    padding: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
    color: colors.muted,
  },
  totalStrong: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderColor: colors.line,
    fontSize: 10,
    fontWeight: 500,
    color: colors.ink,
  },
  vatNote: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 8,
  },
  notes: {
    marginTop: 14,
  },
  notesBody: {
    color: colors.muted,
    lineHeight: 1.45,
  },
  footer: {
    position: "absolute",
    left: 28,
    right: 28,
    bottom: 16,
    borderTopWidth: 1,
    borderColor: colors.line,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    color: colors.muted,
    fontSize: 7.5,
  },
});

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaCell}>
      <Text style={styles.label}>{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}

export function QuotePdfDocument({ view }: { view: QuotePdfView }) {
  const sellerLines = [
    view.seller.addressLine,
    `${view.seller.postalCode} ${view.seller.city}`,
    view.seller.email,
    view.seller.phone,
  ];

  return (
    <Document
      title={view.documentTitle}
      author={view.seller.name}
      subject={view.documentTitle}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <QuotePdfLogo width={128} />
          <View style={styles.headerMeta}>
            <Text style={styles.kicker}>Offerte</Text>
            <Text style={styles.headerTitle}>{view.versionLabel}</Text>
            <Text style={styles.headerSub}>{view.statusLabel}</Text>
          </View>
        </View>
        <View style={styles.accent} fixed />

        <View style={styles.body}>
          <View style={styles.parties}>
            <View style={styles.party}>
              <Text style={styles.label}>Van</Text>
              <Text style={styles.partyName}>{view.seller.name}</Text>
              {sellerLines.map((line) => (
                <Text key={line} style={styles.partyLine}>
                  {line}
                </Text>
              ))}
            </View>
            <View style={styles.party}>
              <Text style={styles.label}>Aan</Text>
              <Text style={styles.partyName}>{view.customer.name}</Text>
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
              {view.customer.contactName ? (
                <Text style={styles.partyLine}>
                  T.a.v. {view.customer.contactName}
                </Text>
              ) : null}
              {view.customer.contactMeta ? (
                <Text style={styles.partyLine}>
                  {view.customer.contactMeta}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.meta}>
            <MetaCell label="Datum" value={view.createdAt} />
            <MetaCell label="Offertenummer" value={view.quoteNumber} />
            <MetaCell
              label="Versie"
              value={view.versionNumber > 0 ? `v${view.versionNumber}` : "—"}
            />
            <MetaCell label="Geldig tot" value={view.validUntil ?? "—"} />
          </View>

          {view.items.map((item, index) => (
            <View key={`${item.title}-${index}`} style={styles.item} wrap={false}>
              <View style={styles.itemHead}>
                <View>
                  <Text style={styles.itemTitle}>
                    {index + 1}. {item.title}
                  </Text>
                  {item.sku ? (
                    <Text style={styles.itemSku}>{item.sku}</Text>
                  ) : null}
                </View>
                <View>
                  <Text style={styles.itemPrice}>
                    {item.quantity} × {formatEuroExact(item.unitPrice)}
                  </Text>
                  <Text style={styles.itemPrice}>
                    {formatEuroExact(item.lineTotal)}
                  </Text>
                </View>
              </View>
              {item.selections.length > 0 ? (
                <View style={styles.selections}>
                  {item.selections.map((selection) => (
                    <View
                      key={`${selection.name}-${selection.value}`}
                      style={styles.selection}
                    >
                      <Text style={styles.selectionName}>{selection.name}</Text>
                      <Text style={styles.selectionValue}>
                        {selection.value}
                        {selection.priceOnRequest
                          ? " · prijs op aanvraag"
                          : selection.priceDelta
                            ? ` · ${formatEuroExact(selection.priceDelta)}`
                            : ""}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {item.hasOnRequest ? (
                <Text style={styles.onRequest}>
                  Bevat opties met prijs op aanvraag (n.t.b. door
                  productspecialist).
                </Text>
              ) : null}
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
              <Text>
                Btw {view.vatRate}%
                {view.vatRegimeLabel ? ` · ${view.vatRegimeLabel}` : ""}
              </Text>
              <Text>{formatEuroExact(view.vatAmount)}</Text>
            </View>
            <View style={styles.totalStrong}>
              <Text>Totaal incl. btw</Text>
              <Text>{formatEuroExact(view.totalInclVat)}</Text>
            </View>
            {view.vatNotice ? (
              <Text style={styles.vatNote}>{view.vatNotice}</Text>
            ) : null}
          </View>

          {view.notes ? (
            <View style={styles.notes}>
              <Text style={styles.label}>Opmerkingen</Text>
              <Text style={styles.notesBody}>{view.notes}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer} fixed>
          <Text>
            {view.seller.name} · {view.seller.addressLine},{" "}
            {view.seller.postalCode} {view.seller.city} · KvK{" "}
            {view.seller.cocNumber} · {view.seller.website}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
