import os
import sys
from dotenv import load_dotenv

# Load env variables
load_dotenv()

def update_frontend_env(contract_address: str):
    """Automatically writes/updates the deployed contract address in the frontend env file."""
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
    env_path = os.path.join(frontend_dir, ".env.local")
    
    # Ensure frontend directory exists
    if not os.path.exists(frontend_dir):
        print(f"Error: Frontend directory not found at {frontend_dir}")
        return
        
    # Read existing content if file exists
    lines = []
    address_updated = False
    
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            lines = f.readlines()
            
        for idx, line in enumerate(lines):
            if line.strip().startswith("NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS="):
                lines[idx] = f'NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS="{contract_address}"\n'
                address_updated = True
                break
                
    if not address_updated:
        lines.append(f'NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS="{contract_address}"\n')
        
    # Write updated config
    with open(env_path, "w") as f:
        f.writelines(f.strip() + "\n" for f in lines if f.strip())
        
    print(f"\n[Success] Automatically updated {env_path}")
    print(f"NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS is set to: {contract_address}")

def main():
    print("=" * 60)
    print("GenArtAuth Intelligent Contract Deployment Orchestrator")
    print("=" * 60)
    
    # 1. Read contract code
    contract_path = os.path.join(os.path.dirname(__file__), "gen_art_auth.py")
    if not os.path.exists(contract_path):
        print(f"Error: Contract file not found at {contract_path}")
        sys.exit(1)
        
    with open(contract_path, "r") as f:
        contract_code = f.read()
        
    private_key = os.getenv("PRIVATE_KEY", "")
    rpc_url = os.getenv("GENLAYER_RPC_URL", "")
    
    try:
        import genlayer_py
        from genlayer_py.client import GenLayerClient
        from genlayer_py.accounts.account import Account
        
        if private_key:
            if not private_key.startswith("0x"):
                private_key = "0x" + private_key
            account = Account.from_key(private_key)
            print(f"Deployer Account (from PRIVATE_KEY): {account.address}")
        else:
            account = Account.create()
            print(f"Generated Ephemeral Account: {account.address}")
            print(f"Private Key: {account.key.hex()}")
            
        print("Broadcasting deployment transaction to GenLayer Network...")
        
        # Try Bradbury testnet first, fallback to Studionet
        client = None
        tx_hash = None
        if rpc_url:
            client = GenLayerClient(rpc_url)
            tx_hash = client.deploy_contract(code=contract_code, account=account, args=[])
        else:
            try:
                client = GenLayerClient(chain_config=genlayer_py.chains.testnet_bradbury)
                print("Connected to testnet_bradbury RPC: https://rpc-bradbury.genlayer.com")
                tx_hash = client.deploy_contract(code=contract_code, account=account, args=[])
            except Exception as e:
                print(f"Bradbury deployment attempt returned: {e}")
                print("Falling back to GenLayer Studionet RPC...")
                client = GenLayerClient(chain_config=genlayer_py.chains.studionet)
                tx_hash = client.deploy_contract(code=contract_code, account=account, args=[])

        print(f"\nTransaction Broadcast Successfully!")
        print(f"Tx Hash: {tx_hash}")
        print("Waiting for deployment receipt...")
        
        receipt = client.wait_for_transaction_receipt(tx_hash)
        
        # Receipt object handling
        contract_address = None
        if isinstance(receipt, dict):
            data = receipt.get("data", {})
            if isinstance(data, dict):
                contract_address = data.get("contract_address")
            if not contract_address:
                contract_address = receipt.get("to_address") or receipt.get("contract_address")
        else:
            contract_address = getattr(receipt, "contract_address", None)
            
        print(f"\n[Success] Contract deployed successfully!")
        print(f"Contract Address: {contract_address}")
        print(f"Deployment Tx Hash: {tx_hash}")
        
        if contract_address:
            update_frontend_env(contract_address)
        return contract_address, tx_hash
        
    except ImportError:
        print("\nError: genlayer-py client libraries are missing for programmatic deployment.")
        print("Please deploy via GenLayer Studio instead and copy the address.")
    except Exception as e:
        print(f"\nDeployment failed: {str(e)}")
        print("Please verify your RPC connection, balance, and private key.")

if __name__ == "__main__":
    main()
