# Extração de Funções SQL - Funções.pdf

Este documento contém a extração literal das funções SQL (PostgreSQL) encontradas no arquivo `Funções.pdf`.

---

## 1. Função: choices_modoaplicacao

### Objetivo
Mapear o código do modo de aplicação para sua descrição.

### Código
```sql
CREATE OR REPLACE FUNCTION choices_modoaplicacao(modo SMALLINT) RETURNS TEXT AS $$
BEGIN
    IF modo = 0 THEN
        RETURN 'Superficial';
    ELSEIF modo = 1 THEN
        RETURN 'Incorporado';
    ELSE
        RETURN NULL;
    END IF;
END
$$ LANGUAGE plpgsql;
```

---

## 2. Função: obtem_dose_convencional

### Objetivo
Obter a dose de calcário necessária quando o sistema de plantio é convencional.

### Código
```sql
CREATE OR REPLACE FUNCTION obtem_dose_convencional (
    ph_0_20 DOUBLE PRECISION,
    smp_0_20 DOUBLE PRECISION, 
    ph_referencia_informado DOUBLE PRECISION, 
    prnt DOUBLE PRECISION, 
    out dose_recomendada DOUBLE PRECISION, 
    out modo_aplicacao SMALLINT, 
    out erro SMALLINT, 
    out msg TEXT
) AS $$
BEGIN 
    IF ph_0_20 >= 5.5 THEN
        dose_recomendada:= 0;
        msg:= 'Não é necessária a correção de acidez do solo na área analisada, pois o pH informado é igual ou superior a 5,5.';
        modo_aplicacao := null;
        RETURN;
    END IF;

    SELECT dose
    INTO dose_recomendada
    FROM calagem_calcario
    WHERE indice_smp_inicio <= smp_0_20 AND indice_smp_fim >= smp_0_20 AND ph_referencia = ph_referencia_informado; -- ph_referencia=6 para culturas de grãos.

    IF prnt IS NOT NULL THEN -- se o usuário informar o PRNT
        dose_recomendada := dose_recomendada * 100 / prnt; -- Dose = DOSE x 100 / PRNT que o usuário informar
    END IF;
    
    modo_aplicacao := 1;
    msg := 'Aplicar ' || dose_recomendada || ' toneladas de calcário por hectare no modo ' || choices_modoaplicacao(modo_aplicacao);
END
$$ LANGUAGE plpgsql;
```

---

## 3. Função: obtem_dose_direto_implantacao

### Objetivo
Obter a dose de calcário necessária quando o sistema de plantio é plantio direto em implantação.

### Código
```sql
CREATE OR REPLACE FUNCTION obtem_dose_direto_implantacao (
    ph_0_20 DOUBLE PRECISION, 
    smp_0_20 DOUBLE PRECISION, 
    ph_referencia_informado DOUBLE PRECISION, 
    prnt DOUBLE PRECISION, 
    out dose_recomendada DOUBLE PRECISION,
    out modo_aplicacao SMALLINT, 
    out erro SMALLINT, 
    out msg TEXT
) AS $$
BEGIN
    IF ph_0_20 >= 5.5 THEN
        dose_recomendada := 0;
        msg := 'Não é necessária a correção de acidez do solo na área analisada, pois o pH informado é igual ou superior a 5,5.';
        modo_aplicacao := null;
        RETURN;
    END IF;

    SELECT dose
    INTO dose_recomendada
    FROM calagem_calcario
    WHERE indice_smp_inicio <= smp_0_20 AND indice_smp_fim >= smp_0_20 AND ph_referencia = ph_referencia_informado; -- ph_referencia=6 para culturas de grãos.

    IF prnt IS NOT NULL THEN -- se o usuário informar o PRNT
        dose_recomendada := dose_recomendada * 100 / prnt; -- Dose = DOSE x 100 / PRNT que o usuário informar
    END IF;
    
    modo_aplicacao := 1; -- o modo é incorporado
    msg := 'Com base nas informações fornecidas, a recomendação é aplicar ' || dose_recomendada || ' t ha-1 de calcário, de modo ' || choices_modoaplicacao(modo_aplicacao);
END
$$ LANGUAGE plpgsql;
```

---

## 4. Função: obtem_dose_direto_consolidado_sem_restricao

### Objetivo
Obter a dose de calcário necessária quando o sistema de plantio é plantio direto consolidado sem restrições na camada de 10-20cm.

### Código
```sql
CREATE OR REPLACE FUNCTION obtem_dose_direto_consolidado_sem_restricao (
    ph_0_10 DOUBLE PRECISION, 
    saturacao_base_0_10 DOUBLE PRECISION,
    saturacao_aluminio_0_10 DOUBLE PRECISION, 
    smp_0_10 DOUBLE PRECISION,
    ph_referencia_informado DOUBLE PRECISION, 
    prnt DOUBLE PRECISION, 
    out dose_recomendada DOUBLE PRECISION,
    out modo_aplicacao SMALLINT, 
    out erro SMALLINT, 
    out msg TEXT
) AS $$
BEGIN
    IF ph_0_10 >= 5.5 AND saturacao_base_0_10 >= 65 AND saturacao_aluminio_0_10 < 10 THEN
        dose_recomendada := 0;
        msg := 'Não é necessária a aplicação de corretivo de acidez do solo na área analisada, pois os valores de pH, saturação por alumínio e saturação por bases não trazem indícios de acidez no solo.';
        modo_aplicacao := null;
        RETURN;
    END IF;

    SELECT dose
    INTO dose_recomendada
    FROM calagem_calcario
    WHERE indice_smp_inicio <= smp_0_10 AND indice_smp_fim >= smp_0_10 AND ph_referencia = ph_referencia_informado; -- ph_referencia=6 para culturas de grãos.

    dose_recomendada := dose_recomendada / 4; -- quando o sistema é plantio direto consolidado sem restrições na camada de 10-20cm, dividimos a dose por 4, pois a tabela diz 1/4 de SMP

    IF prnt IS NOT NULL THEN -- se o usuário informar o PRNT
        dose_recomendada := dose_recomendada * 100 / prnt; -- Dose = DOSE x 100 / PRNT que o usuário informar
    END IF;
    
    modo_aplicacao := 0; -- o modo é superficial
    msg := 'Com base nas informações fornecidas, a recomendação é aplicar ' || dose_recomendada || ' t ha-1 de calcário, de modo ' || choices_modoaplicacao(modo_aplicacao);
END
$$ LANGUAGE plpgsql;
```

---

## 5. Função: obtem_dose_direto_consolidado_com_restricao

### Objetivo
Obter a dose de calcário necessária quando o sistema de plantio é plantio direto consolidado com restrições na camada de 10-20cm.

### Código
```sql
CREATE OR REPLACE FUNCTION obtem_dose_direto_consolidado_com_restricao (
    ph_10_20 DOUBLE PRECISION, 
    saturacao_aluminio_10_20 DOUBLE PRECISION,
    smp_10_20 DOUBLE PRECISION,
    ph_referencia_informado DOUBLE PRECISION,
    prnt DOUBLE PRECISION, 
    out dose_recomendada DOUBLE PRECISION,
    out modo_aplicacao SMALLINT, 
    out erro SMALLINT, 
    out msg TEXT
) AS $$
BEGIN
    IF ph_10_20 >= 5.5 AND saturacao_aluminio_10_20 <= 30 THEN
        dose_recomendada:= 0;
        msg:= 'Não é necessária a aplicação de corretivo de acidez do solo na área analisada, pois a saturação de alumínio se encontra igual ou inferior a 30% e o pH se encontra igual ou superior a 5,5. Verifique a condição da área novamente.';
        modo_aplicacao := null;
        RETURN;
    END IF;

    SELECT dose
    INTO dose_recomendada
    FROM calagem_calcario
    WHERE indice_smp_inicio <= smp_10_20 AND indice_smp_fim >= smp_10_20 AND ph_referencia = ph_referencia_informado; -- ph_referencia=6 para culturas de grãos.

    IF prnt IS NOT NULL THEN -- se o usuário informar o PRNT
        dose_recomendada := dose_recomendada * 100 / prnt; -- Dose = DOSE x 100 / PRNT que o usuário informar
    END IF;
    
    modo_aplicacao := 1; -- o modo é incorporado
    msg := 'Com base nas informações fornecidas, a recomendação é aplicar ' || dose_recomendada || ' t ha-1 de calcário, de modo ' || choices_modoaplicacao(modo_aplicacao);
END
$$ LANGUAGE plpgsql;
```
