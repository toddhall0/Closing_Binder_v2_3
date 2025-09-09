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
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111111',
    borderLeft: '4 solid #000000',
    paddingLeft: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  row: {
    fontSize: 10,
    color: '#222222',
    marginBottom: 6,
  },
  label: {
    fontWeight: 'bold',
  },
  block: {
    marginBottom: 10,
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

const roles = [
  { key: 'buyer', label: "Buyer" },
  { key: 'seller', label: "Seller" },
  { key: 'buyer_attorney', label: "Buyer's Attorney" },
  { key: 'seller_attorney', label: "Seller's Attorney" },
  { key: 'escrow_agent', label: "Escrow Agent" },
  { key: 'title_company', label: "Title Insurance Company" },
  { key: 'lender', label: "Lender" },
  { key: 'buyer_broker', label: "Buyer's Broker" },
  { key: 'seller_broker', label: "Seller's Broker" },
];

const getValue = (obj, path) => {
  try {
    return path.split('.').reduce((acc, k) => (acc && acc[k] != null ? acc[k] : null), obj);
  } catch {
    return null;
  }
};

const ContactInfoPDF = ({ project }) => {
  const contactInfo = project?.contact_info || {};

  const renderParty = (role) => {
    const info = contactInfo[role.key] || {};
    const hasAny = [
      'company','representative','address','email','phone','web'
    ].some((f) => !!info[f]);
    const isNA = !!info.not_applicable;
    if (!hasAny && !isNA) return null;
    return (
      <View key={role.key} style={styles.block} wrap={false}>
        <Text style={styles.sectionHeader}>{role.label}</Text>
        {isNA ? (
          <Text style={styles.row}><Text style={styles.label}>{role.label}: </Text>None</Text>
        ) : (
          <>
            {info.company && (
              <Text style={styles.row}><Text style={styles.label}>Company: </Text>{info.company}</Text>
            )}
            {info.representative && (
              <Text style={styles.row}><Text style={styles.label}>Representative: </Text>{info.representative}</Text>
            )}
            {info.address && (
              <Text style={styles.row}><Text style={styles.label}>Address: </Text>{info.address}</Text>
            )}
            {info.email && (
              <Text style={styles.row}><Text style={styles.label}>Email: </Text>{info.email}</Text>
            )}
            {info.phone && (
              <Text style={styles.row}><Text style={styles.label}>Phone: </Text>{info.phone}</Text>
            )}
            {info.web && (
              <Text style={styles.row}><Text style={styles.label}>Web: </Text>{info.web}</Text>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Contact Information</Text>
        {roles.map(renderParty)}
        <View style={styles.footer}>
          <Text>Contact Information</Text>
        </View>
      </Page>
    </Document>
  );
};

export default ContactInfoPDF;


