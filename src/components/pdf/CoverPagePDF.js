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
    padding: 40,
    fontFamily: 'Helvetica'
  },
  header: {
    marginBottom: 30,
    textAlign: 'center',
    borderBottom: '2 solid #000000',
    paddingBottom: 20
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 10,
    fontFamily: 'Helvetica-Bold'
  },
  propertyAddress: {
    fontSize: 16,
    color: '#4A4A4A',
    marginBottom: 5
  },
  photoSection: {
    alignItems: 'center',
    marginVertical: 20,
    minHeight: 250
  },
  propertyPhoto: {
    width: 400,
    height: 250,
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
    marginVertical: 20,
    backgroundColor: '#FAFAFA',
    padding: 15,
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
    fontSize: 12,
    color: '#555555',
    lineHeight: 1.4,
    textAlign: 'center'
  },
  transactionDetails: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#F8F8F8'
  },
  transactionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  transactionItem: {
    width: '48%',
    marginBottom: 8
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginVertical: 15,
    fontFamily: 'Helvetica-Bold'
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 30,
    borderTop: '1 solid #E5E5E5',
    paddingTop: 20
  },
  logo: {
    maxWidth: 120,
    maxHeight: 60,
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
          {mergedData.propertyAddress && (
            <Text style={styles.propertyAddress}>
              {mergedData.propertyAddress}
            </Text>
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

        {/* Property Description */}
        {mergedData.propertyDescription && (
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionTitle}>Property Description</Text>
            {renderDescription(mergedData.propertyDescription)}
          </View>
        )}

        {/* Purchase Price (prominently displayed) */}
        {formattedPurchasePrice && (
          <Text style={styles.purchasePrice}>
            Purchase Price: {formattedPurchasePrice}
          </Text>
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
              return renderSafeImage(
                logoUrl,
                styles.logo,
                null // No placeholder for logos
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