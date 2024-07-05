# app.py
# add request here
from flask import Flask, jsonify, request,send_file
from flask_cors import CORS
from celery import Celery
import uuid 
import asyncio
import solcx
import numpy as np

# add additonal dependencies
import json
import ezkl
import tempfile
import librosa
import os
from pydub import AudioSegment
from mclbn256 import Fr

app = Flask(__name__)
CORS(app)


ARTIFACTS_PATH = 'Artifacts'
if not os.path.isdir(ARTIFACTS_PATH):
    os.makedirs(os.path.join(ARTIFACTS_PATH))
# Add the config for celery here
app.config["CELERY_BROKER_URL"] = os.getenv('APP_BROKER_URI')
app.config["TEMPLATES_AUTO_RELOAD"] = True
celery = Celery('worker', backend=os.getenv('APP_BACKEND'),
                broker=app.config["CELERY_BROKER_URL"])

celery.conf.update(app.config)

# add the task to process audio here
def extract_mel_spec(filename):
    x,sr=librosa.load(filename,duration=3,offset=0.5)
    X = librosa.feature.melspectrogram(y=x, sr=sr)
    Xdb = librosa.power_to_db(X, ref=np.max)
    Xdb = Xdb.reshape(1,128,-1)
    return Xdb

def extract_bytes_addr(addr): 
    addr_int = int(addr, 0)
    rep = Fr(addr_int)

    ser = rep.serialize()

    first_byte = int.from_bytes(ser[0:8], "little")
    second_byte = int.from_bytes(ser[8:16], "little")
    third_byte = int.from_bytes(ser[16:24], "little")
    fourth_byte = int.from_bytes(ser[24:32], "little")

    return [first_byte, second_byte, third_byte, fourth_byte]

def u64_to_fr(array):
    reconstructed_bytes = array[0].to_bytes(8, byteorder='little') \
                            + array[1].to_bytes(8, byteorder='little') \
                              + array[2].to_bytes(8, byteorder='little') \
                                + array[3].to_bytes(8, byteorder='little')
    return Fr(reconstructed_bytes)

async def createSOLVerifier(modelid):
    MODEL_FOLDER = os.path.join(ARTIFACTS_PATH,modelid)
    VK_PATH = os.path.join(MODEL_FOLDER,'verification.vk')
    SETTING_PATH = os.path.join(MODEL_FOLDER,'settings.json')
    ABI_PATH = os.path.join(MODEL_FOLDER, 'ABI.json')
    SOL_CODE_PATH = os.path.join(MODEL_FOLDER, 'verifier.sol')
    SRS_PATH = os.path.join(MODEL_FOLDER, 'kzg.srs')

    res = await ezkl.create_evm_verifier(
        VK_PATH,
        SETTING_PATH,
        SOL_CODE_PATH,
        ABI_PATH,
        SRS_PATH
    )

    assert res == True
    print("Verifier completed successfully")

async def generateWitness(modelid,latest_uuid):
    MODEL_FOLDER = os.path.join(ARTIFACTS_PATH,modelid)
    INPUT_FOLDER = os.path.join(MODEL_FOLDER,'input')
    WITNESS_FOLDER = os.path.join(MODEL_FOLDER,'witness')
    INPUT_PATH = os.path.join(INPUT_FOLDER,f"input_{latest_uuid}.json")
    COMPILED_MODEL_PATH = os.path.join(MODEL_FOLDER,'network.compiled')
    WITNESS_PATH = os.path.join(WITNESS_FOLDER,f"witness_{latest_uuid}.json")
    print(os.path.isfile(INPUT_PATH))

    wit = await ezkl.gen_witness(INPUT_PATH, COMPILED_MODEL_PATH,WITNESS_PATH)
    assert os.path.isfile(WITNESS_PATH)

    return True

async def getSRS(modelid):
    MODEL_FOLDER = os.path.join(ARTIFACTS_PATH,modelid)
    SETTING_PATH = os.path.join(MODEL_FOLDER,'settings.json')
    SRS_PATH = os.path.join(MODEL_FOLDER, 'kzg.srs')

    # srs path
    if not os.path.isfile(SRS_PATH):
        res = await ezkl.get_srs( SETTING_PATH,None,SRS_PATH)
        assert res == True

    return True

@celery.task
def setup(modelid):
    with app.app_context():
        MODEL_FOLDER = os.path.join(ARTIFACTS_PATH,modelid)
        COMPILED_MODEL_PATH = os.path.join(MODEL_FOLDER,'network.compiled')
        PK_PATH = os.path.join(MODEL_FOLDER,'privateKey.pk')
        VK_PATH = os.path.join(MODEL_FOLDER,'verification.vk')
        SETTING_PATH = os.path.join(MODEL_FOLDER,'settings.json')
        SRS_PATH = os.path.join(MODEL_FOLDER, 'kzg.srs')

        res = ezkl.setup(
            COMPILED_MODEL_PATH,
            VK_PATH,
            PK_PATH,
            SRS_PATH
        )
        
        assert res == True
        assert os.path.isfile(VK_PATH)
        assert os.path.isfile(PK_PATH)
        assert os.path.isfile(SETTING_PATH)
        print("Setup completed successfully")

        loop = asyncio.get_event_loop()
        verify = loop.run_until_complete(createSOLVerifier(modelid))

        return {'status': 'success', 'res': res}

@celery.task
def compilecircuit(modelid):
    with app.app_context():
        MODEL_FOLDER = os.path.join(ARTIFACTS_PATH,modelid)
            
        if not os.path.isdir(MODEL_FOLDER):
            os.makedirs(os.path.join(MODEL_FOLDER))
            
        INPUT_FOLDER = os.path.join(MODEL_FOLDER,'input')
        WITNESS_FOLDER = os.path.join(MODEL_FOLDER,'witness')
        PROOF_FOLDER = os.path.join(MODEL_FOLDER,'proof')

        if not os.path.isdir(INPUT_FOLDER):
            os.makedirs(os.path.join(INPUT_FOLDER))
        
        if not os.path.isdir(WITNESS_FOLDER):
            os.makedirs(os.path.join(WITNESS_FOLDER))

        if not os.path.isdir(PROOF_FOLDER):
            os.makedirs(os.path.join(PROOF_FOLDER))

        COMPILED_MODEL_PATH = os.path.join(MODEL_FOLDER,'network.compiled')
        PK_PATH = os.path.join(MODEL_FOLDER,'privateKey.pk')
        VK_PATH = os.path.join(MODEL_FOLDER,'verification.vk')
        SETTING_PATH = os.path.join(MODEL_FOLDER,'settings.json')
        SRS_PATH = os.path.join(MODEL_FOLDER, 'kzg.srs')
        USER_PATH = os.path.join(MODEL_FOLDER, 'users.json')
        MODEL_PATH = os.path.join(MODEL_FOLDER,'network.onnx')
        print("Folder setup completed successfully")
        users = {}
        
        json.dump(users, open(USER_PATH, 'w'))

        py_run_args = ezkl.PyRunArgs()
        py_run_args.input_visibility = "public"
        py_run_args.output_visibility = "public"
        py_run_args.param_visibility = "fixed"

        res = ezkl.gen_settings(MODEL_PATH, SETTING_PATH, py_run_args=py_run_args)
        print("Gen settings completed successfully")

        res = ezkl.compile_circuit(MODEL_PATH, COMPILED_MODEL_PATH, SETTING_PATH)
        print("Compile circuit completed successfully")

        loop = asyncio.get_event_loop()
        verify = loop.run_until_complete(getSRS(modelid))

        return {'status': 'success', 'res': res}
    
@celery.task
def witness(model_name,latest_uuid):
    loop = asyncio.get_event_loop()
    verify = loop.run_until_complete(generateWitness(model_name,latest_uuid))
    print('witness generated successfully.')

    return {'status': 'success', 'res':True}


@celery.task
def prove(model_name,latest_uuid,user_name):
    MODEL_FOLDER = os.path.join(ARTIFACTS_PATH,model_name)
    COMPILED_MODEL_PATH = os.path.join(MODEL_FOLDER,'network.compiled')
    PK_PATH = os.path.join(MODEL_FOLDER,'privateKey.pk')
    SRS_PATH = os.path.join(MODEL_FOLDER, 'kzg.srs')
    WITNESS_FOLDER = os.path.join(MODEL_FOLDER,'witness')
    USER_PATH = os.path.join(MODEL_FOLDER, 'users.json')
    PROOF_FOLDER = os.path.join(MODEL_FOLDER,'proof')

    PROOF_PATH = os.path.join(PROOF_FOLDER,f"proof_{latest_uuid}.json")
    WITNESS_PATH = os.path.join(WITNESS_FOLDER,f"witness_{latest_uuid}.json")

    USER_FILE = open (USER_PATH, "r")
    users_data = json.loads(USER_FILE.read())

    if user_name in users_data:
        user = users_data[user_name]
        model_data = user[model_name]
        on_chain_request = model_data['onChainReq']
        off_chain_request = model_data['offChainReq']
        total_request = model_data['totalReq']
        off_chain_request = off_chain_request + 1
        users_data[user_name][model_name] = {
            'onChainReq':on_chain_request,
            'offChainReq':off_chain_request,
            'totalReq':total_request
        }
        if off_chain_request > total_request:
            return jsonify({'status': 'success', 'res': {"output_hex": "","output": [],"proof_hex": ""},'message':"You don't have enought credits"})
    else:
        users_data[user_name] = {}
        users_data[user_name][model_name] = {
            'onChainReq':0,
            'offChainReq':1,
            'totalReq':10
        }

    USER_FILE.close()
    json.dump(users_data, open(USER_PATH, 'w'))

    res = ezkl.prove(
            WITNESS_PATH,
            COMPILED_MODEL_PATH,
            PK_PATH,
            PROOF_PATH,
            "single",
            SRS_PATH
        )
    
    PROOF_FILE = open (PROOF_PATH, "r")
    proof_data = json.loads(PROOF_FILE.read())
    
    result = {
            "output_hex": proof_data["pretty_public_inputs"]["outputs"][0][0],
            "output": proof_data["pretty_public_inputs"]["rescaled_outputs"][0][0],
            "proof_hex": proof_data["hex_proof"]
        }
    
    PROOF_FILE.close()
    return result

@celery.task
def voice_judge_input(audio,address):
    addr_ints = int(address,0)
    with tempfile.NamedTemporaryFile() as wfo:
        # write audio to temp file
        wfo.write(audio)
        wfo.flush()
        print("Audio written")
        val = extract_mel_spec(wfo.name)
        print("Audio mel spec written")
        # 0 pad 2nd dim to max size
        if val.shape[2] < 130:
            val = np.pad(
                val, ((0, 0), (0, 0), (0, 130-val.shape[2])))
        # truncate to max size
        else:
            val = val[:, :, :130]

        inp = {
            "input_data": [[addr_ints],val.flatten().tolist()],
        }
        return inp
    
async def verifyproofs(model_name,latest_uuid,address,rpc_url):
    MODEL_FOLDER = os.path.join(ARTIFACTS_PATH,model_name)
    PROOF_FOLDER = os.path.join(MODEL_FOLDER,'proof')
    
    PROOF_PATH = os.path.join(PROOF_FOLDER,f"proof_{latest_uuid}.json")
    print(PROOF_PATH)
    res = await ezkl.verify_evm(
        address,
        PROOF_PATH,
        rpc_url
    )

    return res

@celery.task    
def verify(model_name,latest_uuid,address,rpc_url):
    loop = asyncio.get_event_loop()
    verify = loop.run_until_complete(verifyproofs(model_name,latest_uuid,address,rpc_url))
    print('Verify proof successfully.')

    return {'status': 'success', 'res':verify}
    
    return res

@app.route('/', methods=['GET'])
def index():
    return jsonify({'status': 'success', 'res': "Welcome to ezkl proving server"})

@app.route('/checkmodelname', methods=['GET'])
def is_valid_modelname():
    try:
        model_name = request.args.get('model_name')
        is_valid = True
        for path in os.scandir(ARTIFACTS_PATH):
            if path.is_dir():
                if(path.name == model_name):
                    is_valid = False
                    return jsonify({'status': 'success', 'res': {"is_valid":is_valid}})
        return jsonify({'status': 'success', 'res': {"is_valid":is_valid}})
    except Exception as e:
         print(e)
         return jsonify({'status': 'Error', 'res':'Something went wrong. Please try again.'})

@app.route('/userbalance', methods=['GET'])
def user_balance():
    try:
        user_name = request.args.get('address')
        model_name = request.args.get('model_name')
        MODEL_FOLDER = os.path.join(ARTIFACTS_PATH,model_name)
        USER_PATH = os.path.join(MODEL_FOLDER, 'users.json')
        USER_FILE = open (USER_PATH, "r")
        users_data = json.loads(USER_FILE.read())

        if user_name in users_data:
            user = users_data[user_name]
            model_data = user[model_name]
            USER_FILE.close()
            return jsonify({'status': 'success', 'res': model_data,"message":"User have enough credits"})
        
        else:
            USER_FILE.close()
            return jsonify({'status': 'success', 'res': {'onChainReq':0,'offChainReq':0,'totalReq':0},"message":"User doesn't have enough credits"})  
             
    except Exception as e:
         print(e)
         return jsonify({'status': 'Error', 'res':'Something went wrong. Please try again.'})

@app.route('/addusercredit', methods=['POST'])
def add_user():
    try:
        request_data = request.get_json()
        model_name =request_data['model_name']
        user_name =request_data['address']
        new_credit = int(request_data['new_credit'])
        MODEL_FOLDER = os.path.join(ARTIFACTS_PATH,model_name)
        USER_PATH = os.path.join(MODEL_FOLDER, 'users.json')
        USER_FILE = open (USER_PATH, "r")
        users_data = json.loads(USER_FILE.read())

        if user_name in users_data:
            user = users_data[user_name]
            model_data = user[model_name]
            on_chain_request = model_data['onChainReq']
            off_chain_request = model_data['offChainReq']
            total_request = model_data['totalReq']
            total_request = total_request + new_credit
            users_data[user_name][model_name] = {
                'onChainReq':on_chain_request,
                'offChainReq':off_chain_request,
                'totalReq':total_request
            }
        else:
            users_data[user_name] = {}
            users_data[user_name][model_name] = {
                'onChainReq':0,
                'offChainReq':0,
                'totalReq':10
            }

        USER_FILE.close()
        json.dump(users_data, open(USER_PATH, 'w'))
        return jsonify({'status': 'success', 'res':'User details updated successfully.'})
             
    except Exception as e:
         print(e)
         return jsonify({'status': 'Error', 'res':'Something went wrong. Please try again.'})

@app.route('/setup', methods=['POST'])
def setup_task():
    try:
        print('/setup')
        file = request.files['file']
        model_name = request.form.get('model_name')
        MODEL_FOLDER = os.path.join(ARTIFACTS_PATH,model_name)
        
        if not os.path.isdir(MODEL_FOLDER):
            os.makedirs(os.path.join(MODEL_FOLDER))

        MODEL_PATH = os.path.join(MODEL_FOLDER,'network.onnx')
        file.save(MODEL_PATH)
        

        result = compilecircuit.delay(model_name)
        result.ready()  # returns true when ready
        res = result.get()  

        result = setup.delay(model_name)
        result.ready()  # returns true when ready
        res = result.get()  

        return jsonify({'status': 'success', 'res': 'Setup Completed Successfully.'})
    except Exception as e:
         print(e)
         return jsonify({'status': 'Error', 'res':'Something went wrong. Please try again.'})


@app.route('/uploadinput', methods=['POST'])
def upload_input():
    try:
        request_data = request.get_json()
        model_name =request_data['model_name']
        input_data =request_data['input_data']
        # print(model_name)
        latest_uuid = str(uuid.uuid4())
        # print(latest_uuid)

        MODEL_FOLDER = os.path.join(ARTIFACTS_PATH,model_name)
        INPUT_FOLDER = os.path.join(MODEL_FOLDER,'input')
        # print(INPUT_FOLDER)

        INPUT_PATH = os.path.join(INPUT_FOLDER,f"input_{latest_uuid}.json")
        # print(INPUT_PATH)

        data = dict(input_data = input_data)

        # Serialize data into file:
        json.dump(data, open(INPUT_PATH, 'w'))

        return jsonify({'status': 'success', 'res': {"latest_uuid":latest_uuid}})
    except Exception as e:
         print(e)
         return jsonify({'status': 'Error','res':"Something went wrong. Please try again."})

@app.route('/prove', methods=['POST'])
def prove_task():
    try:
        request_data = request.get_json()
        model_name = request_data['model_name']
        user_name =request_data['address']
        latest_uuid = request_data['latest_uuid']
        result = prove.delay(model_name,latest_uuid,user_name)
        result.ready()  # returns true when ready
        res = result.get() 

        
        return jsonify({'status': 'success', 'res': res,'message':"Proof created successfully"})
    
    except Exception as e:
         print(e)
         return jsonify({'status': 'Error'})
    
@app.route('/genwitness', methods=['POST'])
def witness_task():
    try:
        request_data = request.get_json()
        model_name = request_data['model_name']
        latest_uuid = request_data['latest_uuid']
        result = witness.delay(model_name,latest_uuid)
        result.ready()  # returns true when ready
        res = result.get() 
        
        return jsonify({'status': 'success', 'res': 'Witness generated successfully.'})
    
    except Exception as e:
         print(e)
         return jsonify({'status': 'Error'})
    
@app.route('/getverifyer', methods=['GET'])
def verifier():
    try:
        model_name = request.args.get('model_name')
        MODEL_FOLDER = os.path.join(ARTIFACTS_PATH,model_name)
        SOL_CODE_PATH = os.path.join(MODEL_FOLDER,'verifier.sol')
        solcx.install_solc('0.8.0')
        SOL_CODE_DATA = solcx.compile_files([SOL_CODE_PATH], output_values=["abi", "bin"],solc_version="0.8.0",optimize=True,optimize_runs=200)
        SOL_FILE_NAME = ARTIFACTS_PATH+'/'+model_name+'/verifier.sol:Halo2Verifier'
        print(SOL_CODE_DATA[SOL_FILE_NAME])

        return jsonify({'status': 'success','res':{
            'abi':SOL_CODE_DATA[SOL_FILE_NAME]['abi'],
            'bin':SOL_CODE_DATA[SOL_FILE_NAME]['bin']
        }})
    except Exception as e:
         print(e)
         return jsonify({'status': 'Error'})
    

@app.route('/voicejudge', methods=['POST'])
def voicejudge():
    try:
        modelname = request.form['model_name']
        address = request.form['address']
        f = request.files['file'].read()
        print(f)
        result = voice_judge_input.delay(f,address)
        result.ready()  # returns true when ready
        res = result.get()
        
        return jsonify({'status': 'ok', 'res': res})
    
    except Exception as e:
         print(e)
         return jsonify({'status': 'Error'})

@app.route('/verifyproof', methods=['POST'])
def verifyproof_task():
    try:
        request_data = request.get_json()
        model_name = request_data['model_name']
        latest_uuid = request_data['latest_uuid']
        address = request_data['address']
        rpc_url = request_data['rpc_url']
        result = verify.delay(model_name,latest_uuid,address,rpc_url)
        result.ready()  # returns true when ready
        res = result.get()
        
        return jsonify({'status': 'ok', 'res': res['res']})
    
    except Exception as e:
         print(e)
         return jsonify({'status': 'Error'})
    

if __name__ == "__main__":
		app.run(port=8000)