import React, { useState, useEffect, createRef } from 'react';
import '../css/CreateModel.css'
import MetaMaskOnboarding from '@metamask/onboarding';
import { create } from 'ipfs-http-client'
import AIMarketPlace from '../script/AIMarketPlace'
import web3 from '../script/web3_'
import { Buffer } from 'buffer';

const projectId = process.env.REACT_APP_PROJECTID;
const projectSecret = process.env.REACT_APP_PROJECTSECRET;
const url = process.env.REACT_APP_BACKEND_URL;
const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');
const ipfsClient = create({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
        authorization: auth,
    },
})

function CreateModel() {
    const [modelfile, setModelFile] = useState()
    const [errorMessage, setErrorMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [accounts, setAccounts] = useState('')
    const [modelname, setModelname] = useState('')
    const [modeldesc, setModeldesc] = useState('')
    const [modelType, setModelType] = useState('')
    const [modelFee, setModelFee] = useState('')
    const [isModelnameValid, setIsModelnameValid] = useState(true)


    useEffect(() => {
        handleaccounts()
    }, []);

    const handleaccounts = async () => {
        function handleNewAccounts(newAccounts) {
            setAccounts(newAccounts);
        }
        if (MetaMaskOnboarding.isMetaMaskInstalled()) {
            await window.ethereum
                .request({ method: 'eth_requestAccounts' })
                .then(handleNewAccounts);
            await window.ethereum.on('accountsChanged', handleNewAccounts);
            return async () => {
                await window.ethereum.off('accountsChanged', handleNewAccounts);
            };
        }
    }

    async function uploadData() {

        try {
            const metaDataPath = await ipfsClient.add(JSON.stringify({
                modelName: modelname,
                modelDesc: modeldesc,
                modelType: modelType,
                modelFee: web3.utils.toWei(modelFee, 'ether')
            }))
            console.log(metaDataPath)
            await ipfsClient.pin.add(metaDataPath.path.toString())
            return metaDataPath.path.toString()

        } catch (err) {
            console.log(err)
            setErrorMessage("Opps! Somthing went wrong.")
            return 'error'
        }

    }

    const onSubmitCreateModel = async (event) => {
        setErrorMessage('')
        event.preventDefault()
        setLoading(false)
        try {
            setErrorMessage('Uploading model data to IPFS...')
            const CID = await uploadData()
            if (CID !== 'error') {
                setErrorMessage('Uploaded model data to IPFS.')
                console.log(CID)
                let data = new FormData()
                data.append('file', modelfile)
                data.append('fileName', modelfile.name)
                data.append('model_name', modelname)
                setErrorMessage('Settingup model to backend...')
                let response = await fetch(url + '/setup', {
                    method: 'POST',
                    body: data
                })
                let result = await response.json()
                setErrorMessage(result["res"])
                setErrorMessage('Getting verifier contract...')
                response = await fetch(url + '/getverifyer?model_name=' + modelname)
                result = await response.json()
                let abi = result['res']['abi']
                let bytecode = result['res']['bin']
                // console.log(result)
                setErrorMessage('Deploying verifier contract')
                const contract = new web3.eth.Contract(abi);
                contract.options.data = '0x'+bytecode
                const deployTx = contract.deploy();
                const deployedContract = await deployTx
                    .send({
                        from: accounts[0],
                        gas: await deployTx.estimateGas()
                    })
                    .once("transactionHash", (txhash) => {
                        setErrorMessage(`Mining deployment transaction ...`);
                    });
                // The contract is now deployed on chain!
                setErrorMessage(`Contract deployed at ${deployedContract.options.address}`);
                setErrorMessage('Registring Model onchain...');
                result = await AIMarketPlace.methods.createModel(modelname, CID, web3.utils.toWei(modelFee, 'ether'),deployedContract.options.address)
                    .send({ from: accounts[0] })
                setErrorMessage("Model created successfully")

            }
            setLoading(true)
            window.location.reload()

        } catch (error) {
            console.log(error)
            setErrorMessage(error.message)
            setLoading(true)
        }

    }

    const onModelNameChange = async (event) => {
        setModelname(event.target.value)
        let result = await AIMarketPlace.methods.getModel(event.target.value).call()
        console.log(result)
        setIsModelnameValid(!result["status"])
    }

    return (
        <div className='container-fluid'>
            <div className='row d-flex justify-content-center align-items-center'>
                <div className='CreateModelContainer'>
                    <h3 className="card-title m-2 text-center">Model Portal</h3>
                    <div className="container card shadow rounded-2">
                        <div className="accordion accordion-flush mt-2" id="createFlush">
                            <div className="accordion-item">
                                <h2 className="accordion-header" id="create-heading">
                                    <button className='accordion-button fw-bold rounded-2' type="button" data-bs-toggle="collapse" data-bs-target="#create-collapse" aria-expanded="true" aria-controls="create-collapse">
                                        Create Model
                                    </button>
                                </h2>
                                <div id="create-collapse" className='accordion-collapse collapse show' aria-labelledby="create-heading" data-bs-parent="#createFlush">
                                    <div className="accordion-body">
                                        <p className='mt-3'>Fill the below form and create new model.
                                        </p>
                                        <form onSubmit={onSubmitCreateModel}>
                                            <div className="mb-3 row">
                                                <label className="col-sm-2 col-form-label">Creator Address</label>
                                                <div class="col-sm-10">
                                                    <span type='text'
                                                        className="form-control" style={{ background: "#e9ecef" }}
                                                    >{accounts[0]} </span>
                                                </div>
                                            </div>
                                            <div class="mb-3 row">
                                                <label class="col-sm-2 col-form-label">Name</label>
                                                <div class="col-sm-10">
                                                    <input type="text" class={`form-control ${modelname === '' ? `` : isModelnameValid ? `is-valid` : `is-invalid`}`}
                                                        value={modelname}
                                                        onChange={onModelNameChange}
                                                        required
                                                    />
                                                    <div className='valid-feedback' hidden={!isModelnameValid || modelname === ''}>Model name is available</div>
                                                    <div className='invalid-feedback' hidden={isModelnameValid || modelname === ''}>Model name is not available</div>
                                                </div>
                                            </div>
                                            <div class="mb-3 row">
                                                <label class="col-sm-2 col-form-label">Description</label>
                                                <div class="col-sm-10">
                                                    <textarea class="form-control" rows="3"
                                                        value={modeldesc}
                                                        onChange={(event) => setModeldesc(event.target.value)}
                                                        required
                                                    ></textarea>
                                                </div>
                                            </div>
                                            <div class="mb-3 row">
                                                <label class="col-sm-2 col-form-label">Type</label>
                                                <div class="col-sm-10">
                                                    <select class="form-select" aria-label="Default select example" required
                                                        onChange={(event) => setModelType(event.target.value)}>
                                                        <option value=""></option>
                                                        <option value="Production">Production Ready</option>
                                                        <option value="Development">Development Ready</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div class="mb-3 row align-items-center">
                                                <label class="col-sm-2 col-form-label">Fee</label>
                                                <div class="col-sm-2">
                                                    <input type="number" class="form-control"
                                                        value={modelFee}
                                                        onChange={(event) => setModelFee(event.target.value)}
                                                        required />
                                                </div>
                                                <div className='col-sm-3'>
                                                    <span className='fw-light'> FRXETH</span>
                                                </div>
                                            </div>
                                            <div class="mb-3 row">
                                                <label class="col-sm-2 col-form-label">Model File</label>
                                                <div class="col-sm-10">
                                                    <input type="file" class="form-control"
                                                        onChange={(event) => setModelFile(event.target.files[0])} />
                                                    <p className='fw-light'>Upload your model's onnx file</p>
                                                </div>
                                            </div>
                                            <span className="text-danger" hidden={!errorMessage}>{errorMessage}</span>
                                            <div className="mb-3 d-flex" style={{ alignItems: 'center' }}>
                                                <button type="submit" className="btn btn-marketplace form-control" disabled={(!loading || !isModelnameValid)}>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" hidden={loading}></span>
                                                    Create Model</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}


export default CreateModel