import React, { useEffect, useState } from 'react'
import { json, useParams } from 'react-router-dom';
import MetaMaskOnboarding from '@metamask/onboarding';
import '../css/Application.css'
import verifier from '../script/Verifier';
import AIMarketPlace from '../script/AIMarketPlace'
const projectId = process.env.REACT_APP_PROJECTID;
const projectSecret = process.env.REACT_APP_PROJECTSECRET;
const url = process.env.REACT_APP_BACKEND_URL;
const modelName = 'VoiceJudge3'

function Application() {
    const [accounts, setAccounts] = useState('');
    const [audiofile, setAudioFile] = useState()
    const [errorMessage, setErrorMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [modelObj, setModelObj] = useState({})
    const [voiceScore,setVoiceScore] = useState('Not Calculated yet')
    const [isProofGen,setIsProofGen] = useState(false)
    const [verifyLoading, setVerifyLoading] = useState(true)
    const [proofHex,setProofHex] = useState('')
    const [scoreHex,setScoreHex] = useState('')
    const [uuid,setUUID] = useState('')

    useEffect(() => {
        function handleNewAccounts(newAccounts) {
            setAccounts(newAccounts);
        }
        async function onboarding() {
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
        onboarding()
    }, []);

    useEffect(() => {
        getModel()
    }, [])

    const getModel = async () => {
        let result = await AIMarketPlace.methods.getModel(modelName).call()
        console.log(result)
        setModelObj(result)

    }

    const uploadAudioSubmit = async (event) => {
        event.preventDefault()
        setLoading(false)
        setIsProofGen(false)
        try {
            let formdata = new FormData()
            formdata.append('file',audiofile)
            formdata.append('fileName', audiofile.name)
            formdata.append('model_name', modelName)
            formdata.append('address',accounts[0])
            setErrorMessage('Uploading and Processing Audio File...')
            let response = await fetch(url+'/voicejudge',{
                method: 'POST',
                body: formdata
            })
            let result = await response.json()
            setErrorMessage('Saving audio data...')
            let inputdata = result['res']['input_data']
            console.log(inputdata)
            response = await fetch(url+'/uploadinput',{
                method: 'POST',
                headers: {
                    "content-type": "application/json"
                },
                body: JSON.stringify({
                    "model_name":modelName,
                    "input_data": inputdata
                })
            })
            result = await response.json()
            let uuid = result['res']['latest_uuid']
            setUUID(uuid)
            setErrorMessage('Generating Witness...')
            response = await fetch(url+'/genwitness',{
                method: 'POST',
                headers: {
                    "content-type": "application/json"
                },
                body: JSON.stringify({
                    "model_name": modelName,
                    "latest_uuid":uuid
                })
            })
            result = await response.json()
            setErrorMessage(result['res'])
            setErrorMessage('Generating Proof will take sometime...')
            response = await fetch(url+'/prove',{
                method:'POST',
                headers: {
                    "content-type": "application/json"
                },
                body:JSON.stringify({
                    "model_name":modelName,
                    "address":accounts[0],
                    "latest_uuid":uuid
                })
            })
            result = await response.json()
            setErrorMessage(result['message'])
            getScore(result['res']['output'])
            setProofHex(result['res']['proof_hex'])
            setScoreHex(result['res']['output'])
            console.log(result)
            setLoading(true)
            setIsProofGen(true)
        } catch (error) {
            setErrorMessage(error.message)
            setLoading(true)
        }
    }

    const getScore = (score)=>{
        let rating;
        if (score >= 0 && score < 2) {
            rating = "D"
          }
          else if (score >= 2 && score < 4) {
            rating = "C"
          }
          else if (score >= 4 && score < 6) {
            rating = "B"
          }
          else if (score >= 6 && score < 7) {
            rating = "A"
          }
          else if (score >= 7 && score < 8) {
            rating = "S"
          }
          else {
            rating = "X"
          }
        setVoiceScore(rating)
    }

    const verifyOnChain = async (event) =>{
        event.preventDefault()
        setVerifyLoading(false)
        console.log(modelObj['verifier'])
        try {
            // console.log(proofHex)
            // console.log(scoreHex)
            let response = await fetch(url+'/verifyproof',{
                method: 'POST',
                headers:{
                    "content-type": "application/json",
                },
                body:JSON.stringify({
                    "model_name":modelName,
                    "latest_uuid":uuid,
                    "address":modelObj["verifier"],
                    "rpc_url":process.env.REACT_APP_NETWORK_URL
                })
            })
            let result = await response.json()
            console.log(result)
            if(result['res'] === true){
                setErrorMessage("Proof verification succeeded.")
            }else {
                setErrorMessage("Proof verification failed.")
            }
            setVerifyLoading(true)
        } catch (error) {
            console.log(error)
            setErrorMessage(error.message)
            setVerifyLoading(true)
        }
        
    }

    return (
        <div className='container-fluid'>
            <div className='row d-flex justify-content-center align-items-center'>
                <div className='ApplicationContainer'>
                    <h3 className="card-title m-2 text-center">Voice Judge Model's Application</h3>
                    <div className="container card shadow rounded-2">
                        <div className="accordion accordion-flush mt-2" id="createFlush">
                            <div className="accordion-item">
                                <h2 className="accordion-header" id="create-heading">
                                    <button className='accordion-button fw-bold rounded-2' type="button" data-bs-toggle="collapse" data-bs-target="#create-collapse" aria-expanded="true" aria-controls="create-collapse">
                                        Get your voice score
                                    </button>
                                </h2>
                                <div id="create-collapse" className='accordion-collapse collapse show' aria-labelledby="create-heading" data-bs-parent="#createFlush">
                                    <div className="accordion-body">
                                        <p className='mt-3'>Upload your audio and get rating from the Voice Judge's Model.
                                        </p>
                                        <form >
                                            <div className="mb-3 row">
                                                <label className="col-sm-2 col-form-label">Creator Address</label>
                                                <div class="col-sm-10">
                                                    <span type='text'
                                                        className="form-control" style={{ background: "#e9ecef" }}
                                                    >{modelObj['creator']} </span>
                                                </div>
                                            </div>
                                            <div className="mb-3 row">
                                                <label className="col-sm-2 col-form-label">Verifier Address</label>
                                                <div class="col-sm-10">
                                                    <span type='text'
                                                        className="form-control" style={{ background: "#e9ecef" }}
                                                    >{modelObj['verifier']} </span>
                                                </div>
                                            </div>
                                            <div class="mb-3 row">
                                                <label class="col-sm-2 col-form-label">Audio File</label>
                                                <div class="col-sm-10">
                                                    <input type="file" class="form-control"
                                                        onChange={(event) => setAudioFile(event.target.files[0])} />
                                                    <p className='fw-light'>Upload your audio file</p>
                                                </div>
                                            </div>
                                            <div className="mb-3 row">
                                                <label className="col-sm-2 col-form-label">Voice Score</label>
                                                <div class="col-sm-10">
                                                    <span type='text'
                                                        className="form-control" style={{ background: "#e9ecef" }}
                                                    >{voiceScore} </span>
                                                </div>
                                            </div>
                                            <span className="text-danger" hidden={!errorMessage}>{errorMessage}</span>
                                            <div className="mb-3 d-flex" style={{ alignItems: 'center' }}>
                                                <button onClick={uploadAudioSubmit} className="btn btn-marketplace form-control m-2" disabled={(!loading)}>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" hidden={loading}></span>
                                                    Upload Audio</button>
                                                <button onClick={verifyOnChain} className="btn btn-marketplace form-control m-2" disabled={(!isProofGen || !verifyLoading)}>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" hidden={verifyLoading}></span>
                                                    Verify Proof</button>
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

export default Application