import React from 'react';
import HomePage from '@/components/HomePage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CADONCE | Precision CAD Management Platform',
  description: 'The all-in-one workspace for professional CAD organizations and master designers. Featuring 3D CAD viewports, client CRM, and automated commission-free payouts.',
};

export default function HomeRoute() {
  return <HomePage />;
}
