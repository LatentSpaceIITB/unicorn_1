'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function WingmanLobby() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ backgroundColor: 'var(--terminal-bg)' }}
    >
      <div className="max-w-md w-full text-center">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1
            className="text-2xl md:text-3xl font-mono mb-4"
            style={{ color: 'var(--terminal-text)' }}
          >
            [ OPERATION: WINGMAN ]
          </h1>
          <p
            className="font-mono text-sm"
            style={{ color: 'var(--terminal-dim)' }}
          >
            Two players. One date. Don&apos;t blow it together.
          </p>
        </motion.div>

        {/* Role Selection */}
        <div className="space-y-6">
          {/* Create Room (Dater) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link
              href="/wingman/create"
              className="block w-full p-6 border-2 font-mono text-left hover:opacity-80 transition-opacity"
              style={{
                borderColor: 'var(--terminal-tension)',
                backgroundColor: 'rgba(255, 46, 99, 0.1)',
              }}
            >
              <div
                className="text-lg mb-2"
                style={{ color: 'var(--terminal-tension)' }}
              >
                [ CREATE ROOM ]
              </div>
              <div
                className="text-xs"
                style={{ color: 'var(--terminal-dim)' }}
              >
                You are THE DATER. You type the messages.
                <br />
                Share the code with your wingman.
              </div>
            </Link>
          </motion.div>

          {/* Join Room (Wingman) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Link
              href="/wingman/join"
              className="block w-full p-6 border-2 font-mono text-left hover:opacity-80 transition-opacity"
              style={{
                borderColor: 'var(--terminal-trust)',
                backgroundColor: 'rgba(0, 255, 157, 0.1)',
              }}
            >
              <div
                className="text-lg mb-2"
                style={{ color: 'var(--terminal-trust)' }}
              >
                [ JOIN ROOM ]
              </div>
              <div
                className="text-xs"
                style={{ color: 'var(--terminal-dim)' }}
              >
                You are THE HANDLER. You see the stats.
                <br />
                Enter your friend&apos;s room code.
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12"
        >
          <Link
            href="/"
            className="font-mono text-xs px-4 py-2 border hover:opacity-70 transition-opacity inline-block"
            style={{
              borderColor: 'var(--terminal-dim)',
              color: 'var(--terminal-dim)',
            }}
          >
            [ BACK TO BASE ]
          </Link>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 p-4 border font-mono text-xs text-left"
          style={{ borderColor: 'var(--terminal-dim)' }}
        >
          <div
            className="mb-2 tracking-wider"
            style={{ color: 'var(--terminal-dim)' }}
          >
            [ HOW IT WORKS ]
          </div>
          <ul className="space-y-1" style={{ color: 'var(--terminal-dim)' }}>
            <li>1. Dater creates room, gets 4-letter code</li>
            <li>2. Handler joins with the code</li>
            <li>3. Dater types messages (can&apos;t see stats)</li>
            <li>4. Handler monitors stats & uses abilities</li>
            <li>5. Work together to get the kiss!</li>
          </ul>
        </motion.div>
      </div>
    </main>
  );
}
