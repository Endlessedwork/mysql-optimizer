'use client';

import React, { useState, useEffect } from 'react';
import {
  createConnection,
  updateConnection,
  testConnectionCredentials,
  testConnection,
  listDatabases,
  CreateConnectionInput
} from '@/lib/api-client';
import type { Connection } from '@/lib/types';
import { ChevronDown, Loader2, Database, Check } from 'lucide-react';

interface CreateConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** เมื่อส่งมา = โหมดแก้ไข */
  connection?: Connection | null;
}

const emptyForm: CreateConnectionInput & { databaseName: string } = {
  name: '',
  host: '',
  port: 3306,
  username: '',
  password: '',
  databaseName: '',
};

export const CreateConnectionModal: React.FC<CreateConnectionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  connection: editConnection,
}) => {
  const isEdit = !!editConnection;
  const [formData, setFormData] = useState<CreateConnectionInput & { databaseName: string }>(emptyForm);
  useEffect(() => {
    if (isOpen && editConnection) {
      setFormData({
        name: editConnection.name || '',
        host: editConnection.host || '',
        port: editConnection.port || 3306,
        username: editConnection.username || '',
        password: '',
        databaseName: editConnection.databaseName || editConnection.database || '',
      });
    } else if (isOpen && !editConnection) {
      setFormData(emptyForm);
    }
  }, [isOpen, editConnection]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Database list state
  const [databases, setDatabases] = useState<string[]>([]);
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const type = e.target instanceof HTMLInputElement ? e.target.type : 'text';
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value,
    }));
    // Reset test result and databases if connection params change
    if (['host', 'port', 'username', 'password'].includes(name)) {
      setTestResult(null);
      setDatabases([]);
      setConnectionTested(false);
    }
    setError(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setError(null);
    setDatabases([]);
    setConnectionTested(false);

    try {
      let testSuccess = false;

      if (isEdit && editConnection && !formData.password) {
        const response = await testConnection(editConnection.id);
        if (response.ok && response.data?.connected) {
          setTestResult({ success: true, message: 'Connection successful!' });
          testSuccess = true;
        } else {
          setTestResult({ success: false, message: response.error || 'Connection failed' });
        }
      } else {
        const response = await testConnectionCredentials({
          host: formData.host,
          port: formData.port,
          username: formData.username,
          password: formData.password,
          databaseName: undefined, // Don't pass database for test - we'll list all databases
        });
        if (response.ok && response.data?.connected) {
          setTestResult({ success: true, message: 'Connection successful!' });
          testSuccess = true;
        } else {
          setTestResult({ success: false, message: response.error || 'Connection failed' });
        }
      }

      // If test succeeded, fetch list of databases
      if (testSuccess && formData.password) {
        setConnectionTested(true);
        setIsLoadingDatabases(true);
        try {
          const dbResponse = await listDatabases({
            host: formData.host,
            port: formData.port,
            username: formData.username,
            password: formData.password,
          });
          if (dbResponse.ok && dbResponse.data?.databases) {
            setDatabases(dbResponse.data.databases);
          }
        } catch {
          // Silently fail - user can still type database name manually
        } finally {
          setIsLoadingDatabases(false);
        }
      }
    } catch {
      setTestResult({ success: false, message: 'Failed to test connection' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (isEdit && editConnection) {
        const payload: Partial<CreateConnectionInput> = {
          name: formData.name,
          host: formData.host,
          port: formData.port,
          username: formData.username,
          databaseName: formData.databaseName || undefined,
        };
        if (formData.password) payload.password = formData.password;
        const response = await updateConnection(editConnection.id, payload);
        if (response.ok) {
          onSuccess();
          onClose();
          setFormData(emptyForm);
        } else {
          setError(response.error || 'Failed to update connection');
        }
      } else {
        const response = await createConnection(formData);
        if (response.ok) {
          onSuccess();
          onClose();
          setFormData(emptyForm);
        } else {
          setError(response.error || 'Failed to create connection');
        }
      }
    } catch {
      setError(isEdit ? 'Failed to update connection' : 'Failed to create connection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData(emptyForm);
    setError(null);
    setTestResult(null);
    setDatabases([]);
    setConnectionTested(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />
        
        {/* Modal */}
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500"
              onClick={handleClose}
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg font-semibold leading-6 text-gray-900">
                {isEdit ? 'Edit Connection' : 'Add New Connection'}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {isEdit ? 'แก้ไขรายละเอียดการเชื่อมต่อ' : 'Enter the MySQL database connection details.'}
              </p>
              
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                {/* Connection Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Connection Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Production DB"
                  />
                </div>
                
                {/* Host and Port */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label htmlFor="host" className="block text-sm font-medium text-gray-700">
                      Host *
                    </label>
                    <input
                      type="text"
                      id="host"
                      name="host"
                      required
                      value={formData.host}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="localhost"
                    />
                  </div>
                  <div>
                    <label htmlFor="port" className="block text-sm font-medium text-gray-700">
                      Port *
                    </label>
                    <input
                      type="number"
                      id="port"
                      name="port"
                      required
                      min={1}
                      max={65535}
                      value={formData.port}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                {/* Username and Password */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                      Username *
                    </label>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      required
                      value={formData.username}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="root"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password {isEdit ? '(เว้นว่างไว้ไม่เปลี่ยน)' : '*'}
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      required={!isEdit}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder={isEdit ? 'Leave blank to keep current' : undefined}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                {/* Database Name */}
                <div>
                  <label htmlFor="databaseName" className="block text-sm font-medium text-gray-700">
                    Database Name (optional)
                  </label>
                  {connectionTested && databases.length > 0 ? (
                    <div className="relative mt-1">
                      <select
                        id="databaseName"
                        name="databaseName"
                        value={formData.databaseName}
                        onChange={handleChange}
                        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 appearance-none"
                      >
                        <option value="">-- Select a database --</option>
                        {databases.map((db) => (
                          <option key={db} value={db}>
                            {db}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  ) : isLoadingDatabases ? (
                    <div className="mt-1 flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading databases...</span>
                    </div>
                  ) : (
                    <div className="relative mt-1">
                      <input
                        type="text"
                        id="databaseName"
                        name="databaseName"
                        value={formData.databaseName}
                        onChange={handleChange}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        placeholder={connectionTested ? "No databases found, type manually" : "Test connection first to see available databases"}
                      />
                      {!connectionTested && (
                        <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          Test connection to see available databases
                        </p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Test Result */}
                {testResult && (
                  <div className={`rounded-md p-3 ${testResult.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        {testResult.success ? (
                          <Check className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="ml-3">
                        <p className={`text-sm font-medium ${testResult.success ? 'text-emerald-800' : 'text-red-800'}`}>
                          {testResult.message}
                        </p>
                        {testResult.success && databases.length > 0 && (
                          <p className="text-xs text-emerald-600 mt-1">
                            Found {databases.length} database{databases.length !== 1 ? 's' : ''} — select one above
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Error */}
                {error && (
                  <div className="rounded-md bg-red-50 p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-red-800">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Actions */}
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                  >
                    {isLoading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Connection' : 'Create Connection')}
                  </button>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || !formData.host || !formData.username || (!formData.password && !isEdit)}
                    className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                  >
                    {isTesting ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateConnectionModal;
