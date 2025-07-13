'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import Papa, { ParseResult } from 'papaparse';

interface AirlinerData {
  airliner: string;
  category: string;
  manufacturer: string;
  firstDelivery: number;
  rangeKm: number;
  paxCapacityMin: number;
  paxCapacityMean: number;
  paxCapacityMax: number;
}

export default function Home() {
  const [data, setData] = useState<AirlinerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/data/airliners-sample.csv');
        const csvText = await response.text();
        Papa.parse(csvText, {
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
          complete: (results: ParseResult<any>) => {
            // Transform the data to use camelCase property names
            const transformedData: AirlinerData[] = results.data.map((row: any) => ({
              airliner: row.Airliner,
              category: row.Category,
              manufacturer: row.Manufacturer,
              firstDelivery: row["First delivery"],
              rangeKm: row["Range (km)"],
              paxCapacityMin: row["PAX capacity (min)"],
              paxCapacityMean: row["PAX capacity (mean)"],
              paxCapacityMax: row["PAX capacity (max)"]
            }));
            setData(transformedData);
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
