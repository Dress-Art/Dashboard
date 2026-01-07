'use client'

import { useState, useEffect } from 'react'
import { ClientsPage } from './ClientsPage'
import { ModelsPage } from './ModelsPage'
import { MeasurementsPage } from './MeasurementsPage'

type Tab = 'clients' | 'models' | 'measurements'

export function CouturierModulePage() {
    const [activeTab, setActiveTab] = useState<Tab>('clients')

    const renderContent = () => {
        switch (activeTab) {
            case 'clients':
                return <ClientsPage />
            case 'models':
                return <ModelsPage />
            case 'measurements':
                return <MeasurementsPage />
            default:
                return <ClientsPage />
        }
    }

    return (
        <div className="p-6 bg-gray-50 dark:bg-black min-h-screen">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-black dark:text-white">Module Couturier</h1>
                <p className="text-gray-600 dark:text-gray-400">Gérez vos clients, modèles et mesures.</p>
            </div>

            <div className="border-b border-gray-300 dark:border-gray-700">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('clients')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'clients'
                                ? 'border-black dark:border-white text-black dark:text-white'
                                : 'border-transparent text-gray-500 hover:text-black dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                    >
                        Clients
                    </button>
                    <button
                        onClick={() => setActiveTab('models')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'models'
                                ? 'border-black dark:border-white text-black dark:text-white'
                                : 'border-transparent text-gray-500 hover:text-black dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                    >
                        Modèles
                    </button>
                    <button
                        onClick={() => setActiveTab('measurements')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'measurements'
                                ? 'border-black dark:border-white text-black dark:text-white'
                                : 'border-transparent text-gray-500 hover:text-black dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                    >
                        Mesures
                    </button>
                </nav>
            </div>

            <div className="mt-6">
                {renderContent()}
            </div>
        </div>
    )
}
