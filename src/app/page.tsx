'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import Papa, { ParseResult } from 'papaparse';

interface AirlinerData {
  Airliner: string;
  Category: string;
  Manufacturer: string;
  "First delivery": number;
  "Range (km)": number;
  "PAX capacity (min)": number;
  "PAX capacity (mean)": number;
  "PAX capacity (max)": number;
}

export default function Home() {
  const [data, setData] = useState<AirlinerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/data/airliners-sample.csv');
        const csvText = await response.text();
        Papa.parse<AirlinerData>(csvText, {
          header: true,
          skipEmptyLines: true,
          transform: (value, field) => {
            // Convert numeric fields to numbers
            if (field === "First delivery" || field === "Range (km)" || 
                field === "PAX capacity (min)" || field === "PAX capacity (mean)" || 
                field === "PAX capacity (max)") {
              const num = parseInt(value);
              return isNaN(num) ? 0 : num;
            }
            return value;
          },
          complete: (results: ParseResult<AirlinerData>) => {
            setData(results.data);
            setLoading(false);
          },
          error: (error: any) => {
            console.error('PapaParse error:', error);
            setLoading(false);
          },
        });
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <h1>Airliner Chart</h1>
        <p>Loading data...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>Airliner Chart</h1>
      <p>Data loaded: {data.length} airliners</p>
      
      {/* Visx scatter plot will go here */}
      <div className={styles.chartContainer}>
        <p>Scatter plot coming soon...</p>
        <pre>{JSON.stringify(data.slice(0, 3), null, 2)}</pre>
      </div>
    </div>
  );
}
