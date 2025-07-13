'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';

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
        
        // Parse CSV data
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        const parsedData: AirlinerData[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(',');
            parsedData.push({
              airliner: values[0],
              category: values[1],
              manufacturer: values[2],
              firstDelivery: parseInt(values[3]),
              rangeKm: parseInt(values[4]),
              paxCapacityMin: parseInt(values[5]),
              paxCapacityMean: parseInt(values[6]),
              paxCapacityMax: parseInt(values[7])
            });
          }
        }
        
        setData(parsedData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
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
