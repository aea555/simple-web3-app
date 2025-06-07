'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'
import { ReactNode, Suspense, useEffect, useRef } from 'react'
import toast, { Toaster } from 'react-hot-toast'

import { AccountChecker } from '../account/account-ui' // Assuming this path is correct
import { ClusterChecker, ClusterUiSelect, ExplorerLink } from '../cluster/cluster-ui' // Assuming this path is correct
import { WalletButton } from '../solana/solana-provider' // Assuming this path is correct

/**
 * UiLayout Component
 * Provides the main layout structure for the application, including:
 * - Navigation bar with links to different sections.
 * - Wallet connection and cluster selection.
 * - Central content area for dynamic page content.
 * - Toast notifications for user feedback.
 * - Footer with application credits.
 */
export function UiLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Define the main navigation links for the application
  const appLinks = [
    { label: 'Home', path: '/' },
    { label: 'Account', path: '/account' },
    { label: 'Clusters', path: '/clusters' },
    { label: 'Upload', path: '/upload' },
    { label: 'Fetch', path: '/fetch' },
    { label: "Shared Files", path: "/shared" },
    // Add other relevant links here if your project expands
    // { label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="h-full flex flex-col min-h-screen text-gray-900 dark:text-gray-100 font-inter bg-white dark:bg-gray-900">
      {/* Navbar */}
      <div className="navbar bg-white dark:bg-gray-800 shadow-md flex-col md:flex-row space-y-2 md:space-y-0 px-4 py-3 rounded-b-lg">
        <div className="flex-1">
          {/* Application Logo/Title */}
          <Link className="btn btn-ghost normal-case text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600" href="/">
            Encrypted Storage
          </Link>
          {/* Navigation Links */}
          <ul className="menu menu-horizontal px-1 space-x-1 sm:space-x-2">
            {appLinks.map(({ label, path }) => (
              <li key={path}>
                <Link
                  className={`px-3 py-2 rounded-lg transition-colors duration-200
                    ${pathname === path ? 'bg-violet-100 text-violet-700 dark:bg-violet-700 dark:text-white font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
                  `}
                  href={path}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        {/* Wallet and Cluster Selectors */}
        <div className="flex-none space-x-2">
          <WalletButton />
          <ClusterUiSelect />
        </div>
      </div>

      {/* Checkers for Cluster and Account status */}
      <ClusterChecker>
        <AccountChecker />
      </ClusterChecker>

      {/* Main content area */}
      <main className="flex-grow container mx-auto py-6 px-4 lg:px-8 bg-gray-50 dark:bg-gray-900">
        <Suspense
          fallback={
            <div className="text-center my-32">
              <span className="loading loading-spinner loading-lg text-violet-600"></span>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading content...</p>
            </div>
          }
        >
          {children}
        </Suspense>
        {/* Toast notifications container */}
        <Toaster position="bottom-right" />
      </main>

      {/* Footer */}
      <footer className="footer footer-center p-4 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 rounded-t-lg">
        <aside>
          <p>
            Created by Akar and Çabuk. © {new Date().getFullYear()} Encrypted Storage.
          </p>
        </aside>
      </footer>
    </div>
  );
}

/**
 * AppModal Component
 * A reusable modal dialog for displaying information or gathering user input.
 * Uses HTML <dialog> element for native modal behavior.
 */
export function AppModal({
  children,
  title,
  hide,
  show,
  submit,
  submitDisabled,
  submitLabel,
}: {
  children: ReactNode
  title: string
  hide: () => void
  show: boolean
  submit?: () => void
  submitDisabled?: boolean
  submitLabel?: string
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)

  useEffect(() => {
    if (!dialogRef.current) return
    if (show) {
      dialogRef.current.showModal()
    } else {
      dialogRef.current.close()
    }
  }, [show, dialogRef])

  return (
    <dialog className="modal modal-bottom sm:modal-middle" ref={dialogRef}>
      <div className="modal-box space-y-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-xl p-6">
        <h3 className="font-bold text-2xl text-violet-600 dark:text-violet-400">{title}</h3>
        <div className="py-4 text-gray-800 dark:text-gray-200">
          {children}
        </div>
        <div className="modal-action flex justify-end space-x-2">
          {submit ? (
            <button
              className="btn bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-lg transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={submit}
              disabled={submitDisabled}
            >
              {submitLabel || 'Save'}
            </button>
          ) : null}
          <button
            onClick={hide}
            className="btn bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 px-6 py-2 rounded-lg transition duration-300 ease-in-out"
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  )
}

/**
 * AppHero Component
 * A customizable hero section for pages, displaying a title, subtitle, and optional children.
 */
export function AppHero({
  children,
  title,
  subtitle,
  className = '',
}: {
  children?: ReactNode
  title: ReactNode
  subtitle: ReactNode
  className?: string
}) {
  return (
    <div className={`hero py-16 sm:py-24 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg mb-8 ${className}`}>
      <div className="hero-content text-center">
        <div className="max-w-3xl">
          {typeof title === 'string' ? <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-gray-900 dark:text-white">{title}</h1> : title}
          {typeof subtitle === 'string' ? <p className="py-6 text-lg sm:text-xl text-gray-700 dark:text-gray-300">{subtitle}</p> : subtitle}
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * ellipsify Function
 * Truncates a string with ellipses if it exceeds a certain length.
 * Useful for displaying truncated public keys or CIDs.
 */
export function ellipsify(str = '', len = 4) {
  if (str.length > 30) {
    return str.substring(0, len) + '..' + str.substring(str.length - len, str.length)
  }
  return str
}

/**
 * useTransactionToast Hook
 * Provides a utility function to display a toast notification for Solana transactions.
 */
export function useTransactionToast() {
  return (signature: string) => {
    toast.success(
      <div className={'text-center'}>
        <div className="text-lg font-semibold">Transaction Sent!</div>
        <ExplorerLink path={`tx/${signature}`} label={'View Transaction'} className="btn btn-xs btn-primary mt-2" />
      </div>,
      {
        duration: 5000, // Keep toast visible longer
        style: {
          background: '#4CAF50', // Green background for success
          color: '#fff',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#4CAF50',
        },
      }
    )
  }
}
