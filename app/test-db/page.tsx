"use client";

import { useState } from "react";
import { testDatabaseConnection } from "./actions";

export default function TestDatabasePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
    error?: string;
  } | null>(null);

  const handleTest = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await testDatabaseConnection();
      setResult(response);
    } catch (error) {
      setResult({
        success: false,
        message: "Client-side error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">
          🧪 Teste de Conexão com Banco de Dados
        </h1>

        <p className="text-gray-600 mb-8">
          Este teste irá inserir um registro de teste na tabela{" "}
          <code className="bg-gray-100 px-2 py-1 rounded">recordings</code> e
          verificar a conexão com o Neon.
        </p>

        <button
          onClick={handleTest}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          {loading ? "Testando..." : "🚀 Executar Teste"}
        </button>

        {result && (
          <div
            className={`mt-8 p-6 rounded-lg border-2 ${
              result.success
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <h2
              className={`text-xl font-semibold mb-4 ${
                result.success ? "text-green-800" : "text-red-800"
              }`}
            >
              {result.success ? "✅ Sucesso!" : "❌ Falha"}
            </h2>

            <p
              className={`mb-4 ${
                result.success ? "text-green-700" : "text-red-700"
              }`}
            >
              {result.message}
            </p>

            {result.data && (
              <div className="bg-white p-4 rounded border border-gray-200 overflow-x-auto">
                <p className="text-xs text-gray-500 mb-2 font-mono">
                  Dados retornados:
                </p>
                <pre className="text-sm text-gray-800">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}

            {result.error && (
              <div className="bg-white p-4 rounded border border-red-300 overflow-x-auto">
                <p className="text-xs text-red-500 mb-2 font-mono">
                  Erro detalhado:
                </p>
                <pre className="text-sm text-red-800 whitespace-pre-wrap">
                  {result.error}
                </pre>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            📋 O que este teste faz:
          </h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Verifica a variável DATABASE_URL</li>
            <li>Garante que o usuário demo existe</li>
            <li>Insere um registro de teste na tabela recordings</li>
            <li>Retorna o registro criado com todos os campos</li>
            <li>Mostra erros detalhados se houver falha</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
