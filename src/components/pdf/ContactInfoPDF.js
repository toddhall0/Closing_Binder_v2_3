// ===============================
// FILE: src/components/pdf/ContactInfoPDF.js
// Contact Information PDF Page
// ===============================

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    paddingTop: 56,
    paddingHorizontal: 56,
    paddingBottom: 56,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 12,
  },
  cell: {
    width: '48%',
    border: '1 solid #E5E5E5',
    padding: 10,
    minHeight: 120,
  },
  cellTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 6,
  },
  row: {
    fontSize: 10,
    color: '#222222',
    marginBottom: 8,
  },
  label: {
    fontWeight: 'bold',
  },
  
  footer: {
    position: 'absolute',
    left: 56,
    right: 56,
    bottom: 36,
    textAlign: 'center',
    borderTop: '2 solid #000000',
    fontSize: 10,
    color: '#4A4A4A',
    paddingTop: 10,
  },
});

const pairs = [
  ['buyer', 'seller'],
  ['buyer_attorney', 'seller_attorney'],
  ['buyer_broker', 'seller_broker'],
  ['lender', 'escrow_agent']
];

const getValue = (obj, path) => {
  try {
    return path.split('.').reduce((acc, k) => (acc && acc[k] != null ? acc[k] : null), obj);
  } catch {
    return null;
  }
};

const ContactInfoPDF = ({ project }) => {
  const contactInfo =
    project?.contact_info ||
    project?.cover_page_data?.contact_info ||
    project?.projects?.contact_info ||
    project?.projects?.cover_page_data?.contact_info ||
    {};

  const titleMap = {
    buyer: 'Buyer',
    seller: 'Seller',
    buyer_attorney: "Buyer's Attorney",
    seller_attorney: "Seller's Attorney",
    buyer_broker: "Buyer's Broker",
    seller_broker: "Seller's Broker",
    lender: 'Lender',
    escrow_agent: 'Escrow Agent'
  };

  const renderCell = (key) => {
    const info = contactInfo[key] || {};
    const representativeValue = info.representative || info.representative_name || info.contact || info.name || info.rep || null;
    const hasAny = !!(info.company || representativeValue || info.address || info.email || info.phone || info.web || (key === 'escrow_agent' && info.file_number));
    const isNA = !!info.not_applicable;
    return (
      <View style={styles.cell} wrap={false}>
        <Text style={styles.cellTitle}>{titleMap[key] || key}</Text>
        {isNA ? (
          <Text style={styles.row}>None</Text>
        ) : hasAny ? (
          <>
            {info.company && (
              <Text style={styles.row}><Text style={styles.label}>Company: </Text>{info.company}</Text>
            )}
            {representativeValue && (
              <Text style={styles.row}><Text style={styles.label}>Representative: </Text>{representativeValue}</Text>
            )}
            {(info.address_line1 || info.city || info.state || info.zip) && (
              <Text style={styles.row}>
                <Text style={styles.label}>Address: </Text>
                {[
                  info.address_line1,
                  [info.city, info.state].filter(Boolean).join(', '),
                  info.zip
                ].filter(Boolean).join(' ')}
              </Text>
            )}
            {info.email && (
              <Text style={styles.row}><Text style={styles.label}>Email: </Text>{info.email}</Text>
            )}
            {info.phone && (
              <Text style={styles.row}><Text style={styles.label}>Phone: </Text>{info.phone}</Text>
            )}
            {key === 'lender' && info.loan_amount && (
              <Text style={styles.row}><Text style={styles.label}>Loan Amount: </Text>{info.loan_amount}</Text>
            )}
            {info.web && (
              <Text style={styles.row}><Text style={styles.label}>Web: </Text>{info.web}</Text>
            )}
            {key === 'escrow_agent' && info.file_number && (
              <Text style={styles.row}><Text style={styles.label}>File Number: </Text>{info.file_number}</Text>
            )}
          </>
        ) : (
          <Text style={styles.row}>—</Text>
        )}
      </View>
    );
  };

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Contact Information</Text>
        {pairs.map(([l, r], idx) => (
          <View key={idx} style={styles.gridRow}>
            {renderCell(l)}
            {renderCell(r)}
          </View>
        ))}
        <View style={styles.footer}>
          <Text>Contact Information</Text>
        </View>
      </Page>
    </Document>
  );
};

export default ContactInfoPDF;


