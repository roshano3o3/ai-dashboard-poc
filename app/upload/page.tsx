'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [columnNames, setColumnNames] = useState<string[]>([]);
  const [datasetName, setDatasetName] = useState('');
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/auth');
        return;
      }
      setUser(data.session.user);
    }
    checkUser();
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setDatasetName(selectedFile.name.replace(/\.(csv|xlsx|xls)$/i, ''));
      previewFile(selectedFile);
    }
  };

  const previewFile = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const data = e.target?.result;
      
      if (file.name.endsWith('.csv')) {
        Papa.parse(data as string, {
          header: true,
          complete: (results) => {
            const cleanData = results.data.filter((row: any) => 
              Object.values(row).some(val => val !== null && val !== '')
            );
            
            if (cleanData.length > 0) {
              const columns = Object.keys(cleanData[0]);
              setColumnNames(columns);
              setParsedData(cleanData);
              setPreview(cleanData.slice(0, 5));
            }
          }
        });
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        if (jsonData.length > 0) {
          const columns = Object.keys(jsonData[0]);
          setColumnNames(columns);
          setParsedData(jsonData);
          setPreview(jsonData.slice(0, 5));
        }
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const handleUpload = async () => {
    if (!file || !user || parsedData.length === 0 || !datasetName.trim()) {
      alert('Please provide a dataset name');
      return;
    }
    
    setUploading(true);
    
    try {
      // Insert each row as a separate record with JSONB data
      const dataToInsert = parsedData.map((row: any) => ({
        user_id: user.id,
        dataset_name: datasetName.trim(),
        column_names: columnNames,
        row_data: row
      }));

      const { data, error } = await supabase
        .from('universal_data')
        .insert(dataToInsert);

      if (error) {
        console.error('Error inserting data:', error);
        alert('Error uploading data: ' + error.message);
      } else {
        alert(`Successfully uploaded ${dataToInsert.length} records to dataset "${datasetName}"!`);
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a1f 0%, #2d1b69 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: '24px'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a1f 0%, #2d1b69 100%)',
      padding: '40px 20px',
      fontFamily: "'Inter', -apple-system, sans-serif"
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #667eea 0%, #f5576c 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '12px',
          }}>
            📁 Upload Any Data
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '18px' }}>
            Upload CSV or Excel with ANY columns - we'll automatically adapt!
          </p>
        </div>

        <div style={{
          background: 'rgba(15, 15, 35, 0.9)',
          backdropFilter: 'blur(20px)',
          borderRadius: '30px',
          padding: '50px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          border: '2px solid rgba(102, 126, 234, 0.3)',
          textAlign: 'center'
        }}>
          
          <label htmlFor="file-upload" style={{
            display: 'block',
            border: '3px dashed rgba(102, 126, 234, 0.5)',
            borderRadius: '20px',
            padding: '60px',
            marginBottom: '30px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>📂</div>
            <div style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '10px'
            }}>
              Click here to upload file
            </div>
            <p style={{ color: '#94a3b8', fontSize: '16px', margin: 0 }}>
              Supports CSV, XLSX, XLS with ANY columns!
            </p>
          </label>
          
          <input
            id="file-upload"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            style={{ 
              position: 'absolute',
              width: '1px',
              height: '1px',
              padding: 0,
              margin: '-1px',
              overflow: 'hidden',
              clip: 'rect(0,0,0,0)',
              whiteSpace: 'nowrap',
              border: 0
            }}
          />

          {file && (
            <>
              <div style={{
                background: 'rgba(102, 126, 234, 0.1)',
                border: '2px solid rgba(102, 126, 234, 0.3)',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '20px',
                textAlign: 'left'
              }}>
                <p style={{ color: '#ffffff', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
                  Selected File:
                </p>
                <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '12px' }}>
                  📄 {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
                <p style={{ color: '#4facfe', fontSize: '16px', fontWeight: '700' }}>
                  ✓ {parsedData.length} rows • {columnNames.length} columns detected
                </p>
                <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px' }}>
                  Columns: {columnNames.join(', ')}
                </p>
              </div>

              <div style={{
                marginBottom: '30px',
                textAlign: 'left'
              }}>
                <label style={{
                  display: 'block',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: '700',
                  marginBottom: '10px'
                }}>
                  Dataset Name:
                </label>
                <input
                  type="text"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder="e.g., Sales Data, Customer List, Inventory"
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    fontSize: '16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '2px solid rgba(102, 126, 234, 0.3)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    outline: 'none'
                  }}
                />
              </div>
            </>
          )}

          {preview.length > 0 && (
            <div style={{
              background: 'rgba(15, 15, 35, 0.7)',
              borderRadius: '16px',
              padding: '25px',
              marginBottom: '30px',
              textAlign: 'left',
              maxHeight: '300px',
              overflow: 'auto'
            }}>
              <h3 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '800', marginBottom: '15px' }}>
                Preview (First 5 rows):
              </h3>
              <pre style={{
                color: '#94a3b8',
                fontSize: '14px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {JSON.stringify(preview, null, 2)}
              </pre>
            </div>
          )}

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                padding: '18px 32px',
                fontSize: '18px',
                fontWeight: '800',
                color: '#667eea',
                background: 'rgba(102, 126, 234, 0.15)',
                border: '2px solid #667eea',
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                letterSpacing: '1px'
              }}
            >
              ← BACK
            </button>

            <button
              onClick={handleUpload}
              disabled={!file || uploading || parsedData.length === 0 || !datasetName.trim()}
              style={{
                padding: '18px 32px',
                fontSize: '18px',
                fontWeight: '800',
                color: '#fff',
                background: (file && parsedData.length > 0 && datasetName.trim()) 
                  ? 'linear-gradient(135deg, #667eea 0%, #f5576c 100%)' 
                  : '#444',
                border: 'none',
                borderRadius: '16px',
                cursor: (file && parsedData.length > 0 && datasetName.trim()) ? 'pointer' : 'not-allowed',
                boxShadow: (file && parsedData.length > 0 && datasetName.trim()) 
                  ? '0 8px 25px rgba(102, 126, 234, 0.5)' 
                  : 'none',
                transition: 'all 0.3s ease',
                letterSpacing: '1px'
              }}
            >
              {uploading ? 'UPLOADING...' : 'UPLOAD TO DATABASE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}