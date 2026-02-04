"use client";

import { useState } from "react";
import { migrateThumbnailKey, migratePlaylists } from "../actions/migrate";

export default function MigratePage() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runThumbnailMigration = async () => {
    setIsRunning(true);
    setResult(null);
    const res = await migrateThumbnailKey();
    setResult(res);
    setIsRunning(false);
  };

  const runPlaylistsMigration = async () => {
    setIsRunning(true);
    setResult(null);
    const res = await migratePlaylists();
    setResult(res);
    setIsRunning(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Migração de Banco de Dados</h1>
        <p className="text-gray-600 mb-6">
           Esta página permite executar migrações do banco de dados.
        </p>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h2 className="text-lg font-semibold mb-2">1. Adicionar coluna thumbnail_key</h2>
            <p className="text-sm text-gray-600 mb-4">
              Adiciona a coluna thumbnail_key na tabela recordings e atualiza os registros existentes.
            </p>
            <button
              onClick={runThumbnailMigration}
              disabled={isRunning}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isRunning ? "Executando..." : "Executar Migração"}
            </button>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h2 className="text-lg font-semibold mb-2">2. Criar tabelas de playlists</h2>
            <p className="text-sm text-gray-600 mb-4">
              Cria as tabelas playlists e playlist_items com índices para melhor performance.
            </p>
            <button
              onClick={runPlaylistsMigration}
              disabled={isRunning}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isRunning ? "Executando..." : "Executar Migração"}
            </button>
          </div>
        </div>

        {result && (
          <div
            className={`mt-6 p-4 rounded-lg ${result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
          >
            <h3
              className={`font-semibold mb-2 ${result.success ? "text-green-800" : "text-red-800"}`}
            >
              {result.success ? "✅ Sucesso!" : "❌ Erro"}
            </h3>
            <p className={result.success ? "text-green-700" : "text-red-700"}>
              {result.success ? result.message : result.error}
            </p>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <a href="/" className="text-blue-600 hover:text-blue-700 text-sm">
            ← Voltar para Home
          </a>
        </div>
      </div>
    </div>
  );
}
