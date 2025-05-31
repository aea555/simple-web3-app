'use client'

import React from 'react';
import Link from 'next/link';
import { AppHero } from '../ui/ui-layout'; // Assuming AppHero is in ui-layout

/**
 * DashboardFeature Component
 * Displays the main dashboard for the Encrypted Storage application.
 * Provides quick links to key functionalities like uploading and fetching files.
 * Emphasizes security and decentralized nature of the project.
 */
export default function DashboardFeature() {
  return (
    <div>
      {/* Hero section for the application */}
      <AppHero
        title={
          <span className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
            Encrypted Storage
          </span>
        }
        subtitle="Your secure gateway to decentralized file storage and retrieval."
      />

      {/* Main content area with action buttons */}
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-8"> {/* Increased spacing */}
          <p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
            Protect your digital assets with client-side encryption and store them immutably on IPFS.
            Only you hold the key to your data.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-6"> {/* Increased gap */}
            <Link href="/upload" passHref>
              <button className="w-full sm:w-auto px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75">
                <span className="flex items-center justify-center text-lg"> {/* Larger text */}
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload Files
                </span>
              </button>
            </Link>
            <Link href="/fetch" passHref>
              <button className="w-full sm:w-auto px-10 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75">
                <span className="flex items-center justify-center text-lg"> {/* Larger text */}
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Access Files
                </span>
              </button>
            </Link>
          </div>

          {/* Key Management Reminder */}
          <div className="mt-10 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-inner border border-gray-200 dark:border-gray-700">
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">Important: Your RSA Private Key</h3>
            <p className="text-base text-gray-700 dark:text-gray-300">
              Your files are encrypted with an AES key, which is then encrypted with your RSA Public Key.
              The RSA Private Key is crucial for decrypting your files.
            </p>
            <p className="text-base text-gray-700 dark:text-gray-300 mt-2">
              Please ensure you have securely backed up your RSA Private Key. Without it, your files will be irrecoverable.
            </p>
            {/* You might want a link here to a dedicated /keys page if you create one */}
            {/* <Link href="/settings/keys" passHref>
              <button className="mt-4 px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium rounded-lg transition duration-300 ease-in-out">
                Manage Keys
              </button>
            </Link> */}
          </div>
        </div>
      </div>
    </div>
  );
}
