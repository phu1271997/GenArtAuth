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
        
    # 2. Check for deployment credentials
    private_key = os.getenv("PRIVATE_KEY", "")
    rpc_url = os.getenv("GENLAYER_RPC_URL", "https://testnet.genlayer.network/rpc")
    
    if not private_key:
        print("\n[Notice] No PRIVATE_KEY found in environment variables.")
        print("For testing Intelligent Contracts on GenLayer, deploying via GenLayer Studio is highly recommended:")
        print(" -> https://studio.genlayer.com/run-debug")
        print("\nPlease follow these steps:")
        print(" 1. Copy the contents of 'contracts/gen_art_auth.py'.")
        print(" 2. Paste, compile, and deploy it inside the GenLayer Studio.")
        print(" 3. Copy the deployed contract address.")
        
        try:
            addr = input("\nEnter your deployed contract address to sync with the Frontend: ").strip()
            if addr:
                update_frontend_env(addr)
            else:
                print("Skipped sync. Please manually set NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS in frontend/.env.local.")
        except KeyboardInterrupt:
            print("\nSync cancelled.")
    else:
        print(f"\nDeploying to GenLayer RPC: {rpc_url}...")
        try:
            # Import SDK components dynamically
            from genlayer_py.client import GenLayerClient
            from genlayer_py.accounts import Account
            
            client = GenLayerClient(rpc_url)
            account = Account.from_private_key(private_key)
            
            print(f"Deployer Account: {account.address}")
            print("Broadcasting deployment transaction...")
            
            # Deploy contract on GenLayer
            tx_hash = client.deploy_contract(
                account=account,
                code=contract_code,
                args=[],
                gas_limit=10000000
            )
            
            print(f"Transaction Broadcast! Hash: {tx_hash}")
            print("Waiting for deployment receipt (this may take a few seconds)...")
            
            receipt = client.wait_for_transaction_receipt(tx_hash)
            contract_address = receipt.contract_address
            
            print(f"\n[Success] Contract deployed successfully!")
            print(f"Contract Address: {contract_address}")
            
            # Sync with frontend
            update_frontend_env(contract_address)
            
        except ImportError:
            print("\nError: genlayer-py client libraries are missing for programmatic deployment.")
            print("Please deploy via GenLayer Studio instead and copy the address.")
        except Exception as e:
            print(f"\nDeployment failed: {str(e)}")
            print("Please verify your RPC connection, balance, and private key.")

if __name__ == "__main__":
    main()
