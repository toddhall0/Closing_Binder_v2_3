// ===============================
// FILE: src/components/pdf/CoverPagePDF.js
// Fixed version - condensed details section and proper price formatting
// ===============================

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Create professional styles matching your design
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 72, // 1 inch margins
    fontFamily: 'Helvetica',
  },
  
  // Header Section
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
  },
  
  propertyAddress: {
    fontSize: 16,
    color: '#4A4A4A',
    textAlign: 'center',
    marginBottom: 10,
  },
  
  // Main Photo Section
  photoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  
  photoPlaceholder: {
    width: 400,
    height: 250,
    backgroundColor: '#F5F5F5',
    border: '2 solid #4A4A4A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  photoPlaceholderText: {
    fontSize: 14,
    color: '#4A4A4A',
    textAlign: 'center',
  },
  
  // Property Description Section - CONDENSED
  descriptionSection: {
    marginBottom: 10, // Reduced from 15 to 10
    alignItems: 'center',
  },
  
  descriptionTitle: {
    fontSize: 12, // Reduced from 14 to 12
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 6, // Reduced from 10 to 6
    textAlign: 'center',
  },
  
  descriptionText: {
    fontSize: 10, // Reduced from 12 to 10
    color: '#4A4A4A',
    lineHeight: 1.4, // Reduced from 1.5 to 1.4
    textAlign: 'center',
  },
  
  // Purchase Price Section - CONDENSED
  priceSection: {
    alignItems: 'center',
    marginBottom: 10, // Reduced from 15 to 10
  },
  
  priceText: {
    fontSize: 18, // Reduced from 20 to 18
    fontWeight: 'bold',
    color: '#000000',
  },
  
  // Transaction Details Grid - CONDENSED
  detailsSection: {
    marginBottom: 30, // Reduced from 60 to 30 to give logos more room
  },
  
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  
  detailColumn: {
    width: '48%',
  },
  
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6, // Reduced from 8 to 6
  },
  
  detailLabel: {
    fontSize: 10, // Reduced from 11 to 10
    fontWeight: 'bold',
    color: '#000000',
    width: 70, // Reduced from 80 to 70
  },
  
  detailValue: {
    fontSize: 10, // Reduced from 11 to 10
    color: '#4A4A4A',
    flex: 1,
  },
  
  // Logo Section - ADJUSTED POSITIONING
  logoSection: {
    position: 'absolute',
    bottom: 30, // Moved down further for larger logos
    left: 60,
    right: 60,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 120, // Increased for larger logos
  },
  
  logoPlaceholder: {
    width: 160, // Much larger
    height: 100,  // Much larger
    backgroundColor: '#F5F5F5',
    border: '1 solid #4A4A4A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  logoPlaceholderText: {
    fontSize: 8,
    color: '#4A4A4A',
  },
});

const CoverPagePDF = ({ 
  project = {}, 
  logos = [], 
  coverData = {}, 
  propertyPhoto = {} 
}) => {
  
  // Merge project and coverData to handle both prop structures
  const mergedData = {
    title: project?.title || coverData?.title || 'Closing Binder',
    propertyAddress: project?.property_address || coverData?.propertyAddress || '',
    propertyDescription: project?.property_description || coverData?.propertyDescription || '',
    purchasePrice: project?.purchase_price || coverData?.purchasePrice || '',
    closingDate: project?.closing_date || coverData?.closingDate || '',
    buyer: project?.buyer || coverData?.buyer || '',
    seller: project?.seller || coverData?.seller || '',
    attorney: project?.attorney || coverData?.attorney || '',
    lender: project?.lender || coverData?.lender || '',
    escrowAgent: project?.escrow_agent || coverData?.escrowAgent || ''
  };

  // Format purchase price with proper currency formatting
  const formatPurchasePrice = (value) => {
    if (!value) return '';
    
    // If already formatted with $, use as is
    if (typeof value === 'string' && value.startsWith('$')) {
      return value;
    }
    
    // Convert to string and remove all non-digit chars except decimal
    const numStr = value.toString().replace(/[^\d.]/g, '');
    
    if (!numStr || numStr === '0') return '$0.00';
    
    // Convert to number to handle decimals properly
    const num = parseFloat(numStr);
    if (isNaN(num)) return '';
    
    // Format with commas and 2 decimal places
    return '$' + num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Safe property photo URL extraction
  const getPropertyPhotoUrl = () => {
    return project?.property_photo_url || 
           project?.cover_photo_url || 
           propertyPhoto?.property_photo_url || 
           propertyPhoto?.url ||
           null;
  };

  // Safe logo processing - handle both prop structures
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
        {line || ' '} {/* Empty lines become spaces */}
      </Text>
    ));
  };

  // Safe image rendering function
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

        {/* Main Property Photo */}
        <View style={styles.photoSection}>
          {renderSafeImage(
            propertyPhotoUrl,
            {
              width: 400,
              height: 250,
              objectFit: 'cover',
            },
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

        {/* Purchase Price - WITH PROPER FORMATTING */}
        {formattedPurchasePrice && (
          <View style={styles.priceSection}>
            <Text style={styles.priceText}>
              Purchase Price: {formattedPurchasePrice}
            </Text>
          </View>
        )}

        {/* Transaction Details - CONDENSED */}
        <View style={styles.detailsSection}>
          <View style={styles.detailsGrid}>
            <View style={styles.detailColumn}>
              {mergedData.buyer && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Buyer:</Text>
                  <Text style={styles.detailValue}>{mergedData.buyer}</Text>
                </View>
              )}
              {mergedData.closingDate && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Closing:</Text>
                  <Text style={styles.detailValue}>{formatDate(mergedData.closingDate)}</Text>
                </View>
              )}
              {mergedData.attorney && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Attorney:</Text>
                  <Text style={styles.detailValue}>{mergedData.attorney}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.detailColumn}>
              {mergedData.seller && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Seller:</Text>
                  <Text style={styles.detailValue}>{mergedData.seller}</Text>
                </View>
              )}
              {mergedData.escrowAgent && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Escrow:</Text>
                  <Text style={styles.detailValue}>{mergedData.escrowAgent}</Text>
                </View>
              )}
              {mergedData.lender && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Lender:</Text>
                  <Text style={styles.detailValue}>{mergedData.lender}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Logo Section - ADJUSTED SIZE AND POSITIONING */}
        <View style={styles.logoSection}>
          {safeLogos.map((logo, index) => {
            const logoUrl = logo.url || logo.logo_url;
            return (
              <View key={`logo-${index}`}>
                {renderSafeImage(
                  logoUrl,
                  {
                    width: 160,  // Much larger for better visibility
                    height: 100,  // Much larger for better visibility
                    objectFit: 'contain',
                  },
                  <View style={styles.logoPlaceholder}>
                    <Text style={styles.logoPlaceholderText}>
                      LOGO {index + 1}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
          
          {/* Fill remaining slots with placeholders */}
          {Array.from({ length: 3 - safeLogos.length }).map((_, index) => (
            <View key={`placeholder-${safeLogos.length + index}`} style={styles.logoPlaceholder}>
              <Text style={styles.logoPlaceholderText}>
                LOGO {safeLogos.length + index + 1}
              </Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};

export default CoverPagePDF;