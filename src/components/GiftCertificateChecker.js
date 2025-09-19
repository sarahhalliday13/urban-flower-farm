import React, { useState } from 'react';
import { checkGiftCertificates } from '../services/firebase';

const GiftCertificateChecker = () => {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState(null);

  const handleCheck = async () => {
    setChecking(true);
    try {
      const checkResult = await checkGiftCertificates();
      setResults(checkResult);
    } catch (error) {
      setResults({ error: error.message });
    } finally {
      setChecking(false);
    }
  };

  const formatResults = () => {
    if (!results) return null;

    if (results.error) {
      return (
        <div style={{ backgroundColor: '#ffebee', padding: '15px', borderRadius: '4px', marginTop: '15px' }}>
          <h3 style={{ color: '#c62828', margin: '0 0 10px 0' }}>Error</h3>
          <p>{results.error}</p>
        </div>
      );
    }

    const hasIssues = results.orphanedInventory > 0 || results.completeRecords === 0;
    const bgColor = hasIssues ? '#fff3e0' : '#e8f5e8';
    const titleColor = hasIssues ? '#e65100' : '#2e7d2e';

    return (
      <div style={{ backgroundColor: bgColor, padding: '15px', borderRadius: '4px', marginTop: '15px' }}>
        <h3 style={{ color: titleColor, margin: '0 0 15px 0' }}>Gift Certificate Status</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <div>
            <strong>Plants Found:</strong> {results.plantsFound}
          </div>
          <div>
            <strong>Inventory Entries:</strong> {results.inventoryFound}
          </div>
          <div>
            <strong>Complete Records:</strong> {results.completeRecords}
          </div>
          <div>
            <strong>Orphaned Inventory:</strong> {results.orphanedInventory}
          </div>
        </div>

        {results.giftCertificates && results.giftCertificates.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h4>Active Gift Certificates:</h4>
            <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
              {results.giftCertificates.map(cert => (
                <li key={cert.id}>
                  <strong>{cert.id}</strong> - {cert.name} (${cert.price}) 
                  - Stock: {cert.stock} - Status: {cert.status}
                </li>
              ))}
            </ul>
          </div>
        )}

        {results.orphanedIds && results.orphanedIds.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#d84315' }}>Inventory Without Plant Records:</h4>
            <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
              {results.orphanedIds.map(id => {
                const details = results.inventoryDetails.find(d => d.id === id);
                return (
                  <li key={id} style={{ color: '#d84315' }}>
                    <strong>{id}</strong> - Stock: {details?.stock || 0} - Status: {details?.status || 'Unknown'}
                  </li>
                );
              })}
            </ul>
            <p style={{ fontSize: '0.9em', fontStyle: 'italic', color: '#bf360c' }}>
              These inventory entries exist but have no corresponding plant records. 
              Consider importing gift certificate plant data.
            </p>
          </div>
        )}

        {results.inventoryDetails && results.inventoryDetails.length > 0 && (
          <details style={{ marginTop: '20px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              All Gift Certificate Inventory Details
            </summary>
            <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
              {results.inventoryDetails.map(inv => (
                <li key={inv.id}>
                  <strong>{inv.id}</strong> - Stock: {inv.stock} - Status: "{inv.status}" 
                  - Plant Record: {inv.hasPlantRecord ? '✅' : '❌'}
                </li>
              ))}
            </ul>
          </details>
        )}

        {hasIssues && (
          <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#ffecb3', borderRadius: '4px' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Recommended Actions:</h4>
            <ul style={{ margin: '0', paddingLeft: '20px' }}>
              {results.orphanedInventory > 0 && (
                <li>Import gift certificate plant records using the gift_certificates_sample.json file</li>
              )}
              {results.completeRecords === 0 && (
                <li>No complete gift certificates found - check if they are hidden or need to be imported</li>
              )}
              <li>Review the gift certificate setup in the admin dashboard</li>
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Gift Certificate Database Checker</h2>
      <p>This tool checks the Firebase database for gift certificate data and identifies any issues.</p>
      
      <button 
        onClick={handleCheck} 
        disabled={checking}
        style={{
          padding: '10px 20px',
          backgroundColor: '#1976d2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: checking ? 'not-allowed' : 'pointer',
          fontSize: '16px'
        }}
      >
        {checking ? 'Checking Database...' : 'Check Gift Certificates'}
      </button>

      {formatResults()}
    </div>
  );
};

export default GiftCertificateChecker;