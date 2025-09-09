// ===============================
// FILE: src/components/pdf/CoverPagePDF.js
// FIXED VERSION - Properly includes property images
// ===============================

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Professional styling for cover page
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    paddingTop: 36,
    paddingHorizontal: 36,
    paddingBottom: 36,
    fontFamily: 'Helvetica'
  },
  header: {
    marginBottom: 16,
    textAlign: 'center',
    borderBottom: '2 solid #000000',
    paddingBottom: 12
  },
  propertyDetailsText: {
    fontSize: 11,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 1.3
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 6,
    fontFamily: 'Helvetica-Bold'
  },
  propertyAddress: {
    fontSize: 14,
    color: '#4A4A4A',
    marginBottom: 4
  },
  photoSection: {
    alignItems: 'center',
    marginVertical: 14,
    minHeight: 220
  },
  propertyPhoto: {
    width: 380,
    height: 220,
    objectFit: 'cover',
    border: '1 solid #E5E5E5'
  },
  photoPlaceholder: {
    width: 400,
    height: 250,
    backgroundColor: '#F5F5F5',
    border: '2 dashed #CCCCCC',
    alignItems: 'center',
    justifyContent: 'center'
  },
  photoPlaceholderText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 1.5
  },
  descriptionSection: {
    marginVertical: 12,
    backgroundColor: '#FAFAFA',
    padding: 10,
    border: '1 solid #E5E5E5'
  },
  descriptionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333333',
    fontFamily: 'Helvetica-Bold'
  },
  descriptionText: {
    fontSize: 11,
    color: '#555555',
    lineHeight: 1.4,
    textAlign: 'center'
  },
  highlightsRow: {
    marginTop: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16
  },
  highlightBox: {
    backgroundColor: '#F8F8F8',
    paddingVertical: 8,
    paddingHorizontal: 12,
    border: '1 solid #E5E5E5',
    borderRadius: 4,
    minWidth: 160,
    alignItems: 'center'
  },
  highlightLabel: {
    fontSize: 10,
    color: '#666666',
    fontWeight: 'bold'
  },
  highlightValue: {
    fontSize: 14,
    color: '#111111',
    fontWeight: 'bold',
    marginTop: 2
  },
  transactionDetails: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#F8F8F8'
  },
  transactionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  transactionItem: {
    width: '48%',
    marginBottom: 6
  },
  transactionLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333333',
    fontFamily: 'Helvetica-Bold'
  },
  transactionValue: {
    fontSize: 11,
    color: '#555555',
    marginTop: 2
  },
  purchasePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginVertical: 10,
    fontFamily: 'Helvetica-Bold'
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 16,
    borderTop: '2 solid #000000',
    borderBottom: '2 solid #000000',
    position: 'absolute',
    left: 36,
    right: 36,
    bottom: 48
  },
  logo: {
    maxWidth: 180,
    maxHeight: 90,
    objectFit: 'contain'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 10,
    color: '#666666'
  }
});

const CoverPagePDF = ({ 
  project, 
  logos = [], 
  propertyPhoto = null, 
  customData = {} 
}) => {
  
  // Merge project data with custom overrides
  const mergedData = {
    title: customData.title || project?.title || 'CLOSING BINDER',
    propertyAddress: customData.propertyAddress || project?.property_address || '',
    propertyDescription: customData.propertyDescription || project?.property_description || '',
    purchasePrice: customData.purchasePrice || project?.purchase_price || '',
    closingDate: customData.closingDate || project?.closing_date || '',
    buyer: customData.buyer || project?.buyer || '',
    seller: customData.seller || project?.seller || '',
    escrowAgent: customData.escrowAgent || project?.escrow_agent || '',
    attorney: customData.attorney || project?.attorney || '',
    lender: customData.lender || project?.lender || ''
  };

  // Format purchase price
  const formatPurchasePrice = (price) => {
    if (!price) return '';
    
    const numStr = String(price).replace(/[^0-9.]/g, '');
    
    if (!numStr || numStr === '0') return '$0.00';
    
    const num = parseFloat(numStr);
    if (isNaN(num)) return '';
    
    return '$' + num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // FIXED: Property photo URL extraction with multiple fallbacks
  const getPropertyPhotoUrl = () => {
    // Check multiple possible sources for the property photo
    return project?.property_photo_url || 
           project?.cover_photo_url || 
           propertyPhoto?.property_photo_url || 
           propertyPhoto?.url ||
           customData?.propertyPhotoUrl ||
           null;
  };

  // Safe logo processing
  const getSafeLogos = () => {
    if (!logos || !Array.isArray(logos)) return [];
    
    return logos
      .filter(logo => {
        const logoUrl = logo?.url || logo?.logo_url;
        return logoUrl && typeof logoUrl === 'string' && logoUrl.trim().length > 0;
      })
      .slice(0, 3); // Maximum 3 logos
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Split description into lines for PDF rendering
  const renderDescription = (text) => {
    if (!text) return <Text style={styles.descriptionText}>Property description will appear here.</Text>;
    
    return text.split('\n').map((line, index) => (
      <Text key={index} style={styles.descriptionText}>
        {line || ' '}
      </Text>
    ));
  };

  // FIXED: Safe image rendering with proper error handling
  const renderSafeImage = (imageUrl, imageStyles, placeholder) => {
    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
      return placeholder;
    }

    try {
      return (
        <Image
          src={imageUrl.trim()}
          style={imageStyles}
        />
      );
    } catch (error) {
      console.warn('Failed to render image:', imageUrl, error);
      return placeholder;
    }
  };

  const safeLogos = getSafeLogos();
  const propertyPhotoUrl = getPropertyPhotoUrl();
  const formattedPurchasePrice = formatPurchasePrice(mergedData.purchasePrice);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {mergedData.title}
          </Text>
          {/* Keep only one location line below title - propertyAddress used here once */}
          {mergedData.propertyAddress && (
            <Text style={styles.propertyAddress}>{mergedData.propertyAddress}</Text>
          )}
          {/* Only location and brief description under title */}
          {mergedData.propertyDescription && (
            <View>
              <Text style={styles.propertyDetailsText}>{mergedData.propertyDescription}</Text>
            </View>
          )}
        </View>

        {/* FIXED: Main Property Photo Section with proper image handling */}
        <View style={styles.photoSection}>
          {renderSafeImage(
            propertyPhotoUrl,
            styles.propertyPhoto,
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>
                PROPERTY PHOTO{'\n'}
                Upload a photo using the{'\n'}
                Property Photo Manager
              </Text>
            </View>
          )}
        </View>

        {/* Property Description removed per request */}

        {/* Highlights row to mirror client UI: purchase price + closing date under photo */}
        {(formattedPurchasePrice || mergedData.closingDate) && (
          <View style={styles.highlightsRow}>
            {formattedPurchasePrice && (
              <View style={styles.highlightBox}>
                <Text style={styles.highlightLabel}>Purchase Price</Text>
                <Text style={styles.highlightValue}>{formattedPurchasePrice}</Text>
              </View>
            )}
            {mergedData.closingDate && (
              <View style={styles.highlightBox}>
                <Text style={styles.highlightLabel}>Closing Date</Text>
                <Text style={styles.highlightValue}>{formatDate(mergedData.closingDate)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Transaction Details Grid */}
        <View style={styles.transactionDetails}>
          <View style={styles.transactionGrid}>
            {mergedData.buyer && (
              <View style={styles.transactionItem}>
                <Text style={styles.transactionLabel}>Buyer:</Text>
                <Text style={styles.transactionValue}>{mergedData.buyer}</Text>
              </View>
            )}
            {mergedData.seller && (
              <View style={styles.transactionItem}>
                <Text style={styles.transactionLabel}>Seller:</Text>
                <Text style={styles.transactionValue}>{mergedData.seller}</Text>
              </View>
            )}
            {mergedData.closingDate && (
              <View style={styles.transactionItem}>
                <Text style={styles.transactionLabel}>Closing Date:</Text>
                <Text style={styles.transactionValue}>{formatDate(mergedData.closingDate)}</Text>
              </View>
            )}
            {mergedData.escrowAgent && (
              <View style={styles.transactionItem}>
                <Text style={styles.transactionLabel}>Escrow Agent:</Text>
                <Text style={styles.transactionValue}>{mergedData.escrowAgent}</Text>
              </View>
            )}
            {mergedData.attorney && (
              <View style={styles.transactionItem}>
                <Text style={styles.transactionLabel}>Attorney:</Text>
                <Text style={styles.transactionValue}>{mergedData.attorney}</Text>
              </View>
            )}
            {mergedData.lender && (
              <View style={styles.transactionItem}>
                <Text style={styles.transactionLabel}>Lender:</Text>
                <Text style={styles.transactionValue}>{mergedData.lender}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Company Logos */}
        {safeLogos.length > 0 && (
          <View style={styles.logoContainer}>
            {safeLogos.map((logo, index) => {
              const logoUrl = logo?.url || logo?.logo_url;
              return (
                <View key={logo?.id || index}>
                  {renderSafeImage(
                    logoUrl,
                    styles.logo,
                    null
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Generated on {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default CoverPagePDF;