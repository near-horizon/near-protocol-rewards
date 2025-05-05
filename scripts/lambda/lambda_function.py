import main

def lambda_handler(event, context):
    """
    Função principal de entrada do Lambda.
    Simplesmente repassa a chamada para o lambda_handler no arquivo main.py
    """
    return main.lambda_handler(event, context) 