#!/usr/bin/env python3
"""
Script para migrar dados da planilha Excel para o banco de dados do sistema QMS.
Este script extrai os dados da aba NEW_FORM e insere no banco MySQL.
"""

import pandas as pd
import json
import os
from datetime import datetime

# Caminho da planilha
EXCEL_PATH = "/home/ubuntu/qms-mao-brasil/Weekly_BrazilMAOQualityDefectTrackingList_Local_ver04.xlsx"
OUTPUT_JSON = "/home/ubuntu/qms-mao-brasil/scripts/defects_data.json"
SUPPLIERS_JSON = "/home/ubuntu/qms-mao-brasil/scripts/suppliers_data.json"

def parse_date(value):
    """Converte valor para string de data no formato YYYY-MM-DD"""
    if pd.isna(value) or value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, str):
        # Tentar parsear diferentes formatos
        for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d"]:
            try:
                return datetime.strptime(value.strip(), fmt).strftime("%Y-%m-%d")
            except:
                continue
        return value.strip() if value.strip() else None
    return str(value)

def clean_string(value):
    """Limpa e converte valor para string"""
    if pd.isna(value) or value is None:
        return None
    s = str(value).strip()
    return s if s else None

def clean_int(value):
    """Converte valor para inteiro"""
    if pd.isna(value) or value is None or value == "":
        return None
    try:
        return int(float(value))
    except:
        return None

def extract_data():
    """Extrai dados da planilha Excel"""
    print(f"Lendo planilha: {EXCEL_PATH}")
    
    # Ler a aba NEW_FORM com header na linha 8 (índice 8)
    df = pd.read_excel(EXCEL_PATH, sheet_name="NEW_FORM ", header=8)
    
    print(f"Colunas encontradas: {list(df.columns)}")
    print(f"Total de linhas: {len(df)}")
    
    defects = []
    suppliers_set = set()
    
    for idx, row in df.iterrows():
        # Pular linhas sem Doc. Nº
        doc_number = clean_string(row.get("Doc. Nº"))
        if not doc_number:
            continue
        
        # Mapear dados da planilha para o schema do banco
        supplier = clean_string(row.get("Supplier"))
        
        defect = {
            "docNumber": doc_number,
            "openDate": parse_date(row.get("Open date")),
            "weekNumber": clean_string(row.get("Week")),
            "monthName": clean_string(row.get("Month")),
            "status": clean_string(row.get("Status")),
            "supplier": supplier,
            "material": clean_string(row.get("Material")),
            "pn": clean_string(row.get("PN")),
            "description": clean_string(row.get("Description")),
            "symptom": clean_string(row.get("Symptom")),
            "qtyDefect": clean_int(row.get("QTY")),
            "qtyInspected": clean_int(row.get("Rate")),
            "severityMg": clean_string(row.get("MG")),
            "severityInsp": clean_string(row.get("Defects")),
            "disposition": clean_string(row.get("Detection")),
            "dispositionDate": parse_date(row.get("Data Disposição (Cotenção)")),
            "technicalAnalysis": clean_string(row.get("Tracking Progress ")),
            "technicalAnalysisDate": parse_date(row.get("Data Análise Técnica")),
            "cause": clean_string(row.get("Cause")),
            "causeDate": parse_date(row.get("Data Causa Raiz")),
            "correctiveActions": clean_string(row.get("Corrective actions")),
            "correctiveActionsDate": parse_date(row.get("Data Ação Corretiva")),
            "validationCorrectiveActions": clean_string(row.get("Check Solution")),
            "validationCorrectiveActionsDate": parse_date(row.get("Data Validação Ação Corretiva")),
            "closeDate": parse_date(row.get("Semana de fechamento da ação corretiva")),
            "defectType": clean_string(row.get("Category")),
            "defectOrigin": clean_string(row.get("Occurrence")),
            "supplyFeedback": clean_string(row.get("Supply Feedback")),
            "sqaOwner": clean_string(row.get("Owner")),
            "remarks": clean_string(row.get("Evidence")),
            # Campos adicionais da planilha
            "model": clean_string(row.get("Model")),
            "customer": clean_string(row.get("Customer")),
            "qcrNumber": clean_string(row.get("QCR nº")),
            "target": parse_date(row.get("Target")),
            "statusSupplyFb": clean_string(row.get("Status Supply FB")),
            # Campos calculados (já existentes na planilha)
            "currentResponsible": clean_string(row.get("Responsável Atual")),
            "step": clean_string(row.get("STEP")),
            "agingDisposition": clean_int(row.get("Aging SQA (Disposição)")),
            "agingTechnicalAnalysis": clean_int(row.get("Aging Fornecedor (Análise Técnica)")),
            "agingCauseRoot": clean_int(row.get("Aging Fornecedor (Causa Raiz)")),
            "agingCorrectiveAction": clean_int(row.get("Aging Fornecedor (Ação corretiva)")),
            "agingValidation": clean_int(row.get("Aging SQA (Validação Ação Corretiva)")),
            "agingTotal": clean_int(row.get("Aging (Total)")),
            "agingByStep": clean_int(row.get("Aging \n(By STEP)")),
            "daysLate": clean_int(row.get("DIAS EM ATRASO")),
        }
        
        defects.append(defect)
        
        # Coletar fornecedores únicos
        if supplier:
            suppliers_set.add(supplier)
    
    print(f"\nTotal de defeitos extraídos: {len(defects)}")
    print(f"Total de fornecedores únicos: {len(suppliers_set)}")
    
    # Salvar dados em JSON
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(defects, f, ensure_ascii=False, indent=2)
    print(f"Dados de defeitos salvos em: {OUTPUT_JSON}")
    
    # Criar lista de fornecedores com código de acesso
    import random
    import string
    
    def generate_access_code():
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    
    suppliers = [
        {
            "name": name, 
            "code": f"SUP{str(i+1).zfill(3)}",
            "accessCode": generate_access_code()
        } 
        for i, name in enumerate(sorted(suppliers_set))
    ]
    
    with open(SUPPLIERS_JSON, "w", encoding="utf-8") as f:
        json.dump(suppliers, f, ensure_ascii=False, indent=2)
    print(f"Dados de fornecedores salvos em: {SUPPLIERS_JSON}")
    
    # Mostrar amostra dos dados
    print("\n--- Amostra dos primeiros 5 defeitos ---")
    for d in defects[:5]:
        print(f"  {d['docNumber']}: {d['supplier']} - {d['symptom'][:50] if d['symptom'] else 'N/A'}... Status: {d['status']}")
    
    print("\n--- Fornecedores encontrados ---")
    for s in suppliers[:10]:
        print(f"  {s['code']}: {s['name']} (Código de acesso: {s['accessCode']})")
    if len(suppliers) > 10:
        print(f"  ... e mais {len(suppliers) - 10} fornecedores")
    
    return defects, suppliers

if __name__ == "__main__":
    extract_data()
