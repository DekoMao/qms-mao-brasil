#!/usr/bin/env node
/**
 * Script para inserir dados extraídos da planilha no banco de dados MySQL.
 * Executa inserção de fornecedores e defeitos.
 */

import { readFileSync } from 'fs';
import mysql from 'mysql2/promise';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

const DEFECTS_JSON = '/home/ubuntu/qms-mao-brasil/scripts/defects_data.json';
const SUPPLIERS_JSON = '/home/ubuntu/qms-mao-brasil/scripts/suppliers_data.json';

// Mapeamento de step da planilha para o enum do banco
function mapStep(step) {
  if (!step) return 'Aguardando Disposição';
  const stepMap = {
    'Aguardando Disposição': 'Aguardando Disposição',
    'Aguardando Análise Técnica': 'Aguardando Análise Técnica',
    'Aguardando Causa Raiz': 'Aguardando Causa Raiz',
    'Aguardando Ação Corretiva': 'Aguardando Ação Corretiva',
    'Aguardando Validação de Ação Corretiva': 'Aguardando Validação de Ação Corretiva',
    'CLOSED': 'CLOSED',
    // Mapeamentos alternativos
    'Disposição': 'Aguardando Disposição',
    'Análise Técnica': 'Aguardando Análise Técnica',
    'Causa Raiz': 'Aguardando Causa Raiz',
    'Ação Corretiva': 'Aguardando Ação Corretiva',
    'Validação': 'Aguardando Validação de Ação Corretiva',
  };
  return stepMap[step] || 'Aguardando Disposição';
}

// Mapeamento de status
function mapStatus(status) {
  if (!status) return 'ONGOING';
  const statusMap = {
    'CLOSED': 'CLOSED',
    'ONGOING': 'ONGOING',
    'DELAYED': 'DELAYED',
    'Waiting for CHK Solution': 'Waiting for CHK Solution',
    'On Going': 'ONGOING',
    'On Time': 'ONGOING',
  };
  return statusMap[status] || 'ONGOING';
}

// Mapeamento de MG (severidade)
function mapMg(mg) {
  if (!mg) return null;
  const mgMap = {
    'S': 'S',
    'A': 'A',
    'B': 'B',
    'C': 'C',
    'B0': 'B',
    'B1': 'B',
    'B2': 'B',
    'B3': 'B',
    'B4': 'B',
  };
  return mgMap[mg] || null;
}

async function main() {
  console.log('Iniciando inserção de dados no banco...');
  
  // Conectar ao banco
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  console.log('Conectado ao banco de dados');
  
  try {
    // Ler dados dos arquivos JSON
    const defects = JSON.parse(readFileSync(DEFECTS_JSON, 'utf-8'));
    const suppliers = JSON.parse(readFileSync(SUPPLIERS_JSON, 'utf-8'));
    
    console.log(`\nDados carregados: ${defects.length} defeitos, ${suppliers.length} fornecedores`);
    
    // 1. Inserir fornecedores
    console.log('\n--- Inserindo fornecedores ---');
    for (const supplier of suppliers) {
      try {
        await connection.execute(
          `INSERT INTO suppliers (name, code, accessCode, isActive, createdAt, updatedAt) 
           VALUES (?, ?, ?, true, NOW(), NOW())
           ON DUPLICATE KEY UPDATE code = VALUES(code), accessCode = VALUES(accessCode), updatedAt = NOW()`,
          [supplier.name, supplier.code, supplier.accessCode]
        );
        console.log(`  ✓ ${supplier.name}`);
      } catch (err) {
        console.log(`  ✗ ${supplier.name}: ${err.message}`);
      }
    }
    
    // 2. Inserir defeitos
    console.log('\n--- Inserindo defeitos ---');
    let inserted = 0;
    let errors = 0;
    
    for (const defect of defects) {
      try {
        // Extrair ano da data de abertura
        let year = null;
        if (defect.openDate) {
          const match = defect.openDate.match(/(\d{4})/);
          if (match) year = parseInt(match[1]);
        }
        
        await connection.execute(
          `INSERT INTO defects (
            docNumber, openDate, year, weekKey, monthName,
            mg, defectsSeverity, category,
            model, customer, pn, material,
            symptom, detection, rate, qty,
            description, evidence,
            cause, correctiveActions, trackingProgress,
            supplier, supplyFeedback, statusSupplyFB,
            owner, targetDate, checkSolution, qcrNumber, occurrence,
            dateDisposition, dateTechAnalysis, dateRootCause, dateCorrectiveAction, dateValidation,
            step, status, closeWeekKey,
            createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE 
            status = VALUES(status),
            step = VALUES(step),
            updatedAt = NOW()`,
          [
            defect.docNumber,
            defect.openDate,
            year,
            defect.weekNumber, // weekKey
            defect.monthName,
            mapMg(defect.severityMg), // mg
            defect.severityInsp, // defectsSeverity
            defect.defectType, // category
            defect.model,
            defect.customer,
            defect.pn,
            defect.material,
            defect.symptom,
            defect.disposition, // detection
            defect.qtyInspected, // rate
            defect.qtyDefect, // qty
            defect.description,
            defect.remarks, // evidence
            defect.cause,
            defect.correctiveActions,
            defect.technicalAnalysis, // trackingProgress
            defect.supplier,
            defect.supplyFeedback,
            defect.statusSupplyFb, // statusSupplyFB
            defect.sqaOwner, // owner
            defect.target, // targetDate
            defect.validationCorrectiveActions ? true : false, // checkSolution
            defect.qcrNumber,
            defect.defectOrigin, // occurrence
            defect.dispositionDate, // dateDisposition
            defect.technicalAnalysisDate, // dateTechAnalysis
            defect.causeDate, // dateRootCause
            defect.correctiveActionsDate, // dateCorrectiveAction
            defect.validationCorrectiveActionsDate, // dateValidation
            mapStep(defect.step), // step
            mapStatus(defect.status), // status
            defect.closeDate, // closeWeekKey
          ]
        );
        inserted++;
        if (inserted % 20 === 0) {
          console.log(`  Inseridos: ${inserted}/${defects.length}`);
        }
      } catch (err) {
        errors++;
        console.log(`  ✗ ${defect.docNumber}: ${err.message}`);
      }
    }
    
    console.log(`\n✓ ${inserted} defeitos inseridos com sucesso`);
    if (errors > 0) {
      console.log(`✗ ${errors} erros durante inserção`);
    }
    
    // 3. Verificar contagem final
    const [defectCount] = await connection.execute('SELECT COUNT(*) as count FROM defects');
    const [supplierCount] = await connection.execute('SELECT COUNT(*) as count FROM suppliers');
    
    console.log(`\n--- Resumo do banco de dados ---`);
    console.log(`Total de defeitos: ${defectCount[0].count}`);
    console.log(`Total de fornecedores: ${supplierCount[0].count}`);
    
    // 4. Mostrar amostra dos dados inseridos
    const [sample] = await connection.execute('SELECT docNumber, supplier, status, step FROM defects LIMIT 5');
    console.log('\n--- Amostra dos defeitos inseridos ---');
    for (const row of sample) {
      console.log(`  ${row.docNumber}: ${row.supplier} - ${row.status} (${row.step})`);
    }
    
  } finally {
    await connection.end();
    console.log('\nConexão encerrada');
  }
}

main().catch(console.error);
