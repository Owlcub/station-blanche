import React, { useState } from 'react';
import './AdvancedPCScanner.css';
import { Card } from '../../design-system';
import { Monitor, HardDrive, Cpu } from 'lucide-react';
import RemotePCScanner from './RemotePCScanner';
import DiskImageScanner from './DiskImageScanner';
import MemoryDumpScanner from './MemoryDumpScanner';

const AdvancedPCScanner = () => {
  const [activeTab, setActiveTab] = useState('disk');

  return (
    <div className="advanced-pc-scanner">
      <Card icon={Monitor} title="Scan PC Avancé - 2 Modes">
        <div className="scanner-tabs">
          {/* EDR Network scan temporairement caché */}
          {/* <button
            className={`scanner-tab ${activeTab === 'network' ? 'active' : ''}`}
            onClick={() => setActiveTab('network')}
          >
            <Network size={24} />
            <div className="tab-content">
              <span className="tab-title">Scan Réseau (EDR)</span>
              <span className="tab-desc">PC en ligne avec agent</span>
            </div>
          </button> */}

          <button
            className={`scanner-tab ${activeTab === 'disk' ? 'active' : ''}`}
            onClick={() => setActiveTab('disk')}
          >
            <HardDrive size={24} />
            <div className="tab-content">
              <span className="tab-title">Image Disque (DD/IMG)</span>
              <span className="tab-desc">Fichiers .dd, .img, .raw</span>
            </div>
          </button>

          <button
            className={`scanner-tab ${activeTab === 'memory' ? 'active' : ''}`}
            onClick={() => setActiveTab('memory')}
          >
            <Cpu size={24} />
            <div className="tab-content">
              <span className="tab-title">Memory Dump (RAM)</span>
              <span className="tab-desc">Fichiers .mem, .raw, .dmp</span>
            </div>
          </button>
        </div>

        <div className="scanner-content">
          {activeTab === 'network' && <RemotePCScanner />}
          {activeTab === 'disk' && <DiskImageScanner />}
          {activeTab === 'memory' && <MemoryDumpScanner />}
        </div>
      </Card>
    </div>
  );
};

export default AdvancedPCScanner;
