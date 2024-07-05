import React, { useEffect, useState } from 'react'
import MetaMaskOnboarding from '@metamask/onboarding';
import '../css/Marketplace.css'
import AIMarketPlace from '../script/AIMarketPlace'
import web3 from '../script/web3_'
import { NoDeployments, LoadingContainer } from "./Loading"

const projectId = process.env.REACT_APP_PROJECTID;
const projectSecret = process.env.REACT_APP_PROJECTSECRET;
const url = process.env.REACT_APP_BACKEND_URL;


function Marketplace() {
    const [accounts, setAccounts] = useState('');
    const [isLoading, setIsLoading] = useState(true)
    const [isModelExists, setIsModelExists] = useState(false)
    const [allModels, setAllModels] = useState([])
    const [loading, setLoading] = useState(true)
    const [btnValue,setBtnValue] = useState('')

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
        getAllModels()
    }, [])

    const getAllModels = async () => {
        setIsLoading(false);
        try {
            let result = await AIMarketPlace.methods.totalModel().call()
            let totalModel = parseInt(result.toString())
            let models = []
            if (totalModel > 0) {

                for (let i = 0; i < totalModel; i++) {
                    let _modelname = await AIMarketPlace.methods.allModels(i).call()
                    result = await AIMarketPlace.methods.getModel(_modelname).call()
                    console.log(result)
                    let response = await fetch('https://ipfs.infura.io:5001/api/v0/get?arg=' + result["cid"], {
                        method: 'POST',
                        headers: {
                            "Authorization": "Basic " + btoa(projectId + ":" + projectSecret)
                        }
                    })
                    let IPFSData = await response.text()
                    const startIndex = IPFSData.indexOf("{")
                    const endIndex = IPFSData.indexOf("}")
                    const data = JSON.parse(IPFSData.substring(startIndex, endIndex + 1))
                    console.log(data)
                    let modelUseCount = await AIMarketPlace.methods.modelUseCount(data.modelName).call()
                    let modelObj = {
                        'modelname': data.modelName,
                        'modeldesc': data.modelDesc,
                        'modeltype': data.modelType + ' Ready Model',
                        'modelfee': web3.utils.fromWei(data.modelFee, 'ether'),
                        'creator': result['creator'],
                        'verifier': result['verifier'],
                        'modelUseCount':modelUseCount.toString()
                    }
                    models.push(modelObj)
                }
                console.log(models)
                setAllModels(models)
                setIsModelExists(true)
            } else {
                setIsModelExists(false)
            }
            setIsLoading(true)
        } catch (error) {
            console.log(error)
            setIsLoading(true)
        }

    }

    const Modelcard = () => {
        return (
            allModels.map((model, index) =>
                <div className='col' key={index}>
                    <div className="card shadow rounded-4 card-marketplace">
                        <div className="card-body">
                            <div className="row">
                                <div className="col-12 d-flex justify-content-between align-items-center">
                                    <div className="text-clip">
                                        <h4 className="card-title"> {model["modelname"]} </h4>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <div className="creator-image">
                                            <i class="bi bi-alexa fs-1" style={{ "width": "48px", "height": "48px" }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-12 d-flex justify-content-between">
                                    <div className="product-type code"> {model["modeltype"]} </div>
                                    <div className="product-type code"> Fee {model["modelfee"]} FRXETH </div>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-12 d-flex justify-content-between">
                                    <div className="product-type code"> Used By {model["modelUseCount"]} </div>
                                </div>
                            </div>
                            <div className="row flex-grow-1">
                                <div className="col-12 d-flex flex-column justify-content-between">
                                    <p className="product-summary"> {model["modeldesc"]} </p>
                                </div>
                            </div>
                        </div>
                        {/* <div className="row d-flex justify-content-between">
                            <div className="col-12 ms-2">
                                <div className='fw-ligh'> Verifier Address</div>
                            </div>
                        </div>
                        <div className="row d-flex justify-content-between">
                            <div className="col-12 ms-2">
                                <div className="product-type">{model["verifier"]}</div>
                            </div>
                        </div> */}
                        <div className="row d-flex justify-content-between">
                            <div className="col-12 ms-2">
                                <div className='fw-ligh'> Creator Address </div>
                            </div>
                        </div>
                        <div className="row d-flex justify-content-between">
                            <div className="col-12 ms-2">
                                <div className="product-type">{model["creator"]}</div>
                            </div>
                        </div>
                        <div className="card-footer d-flex justify-content-between rounded-bottom-4 align-items-center">
                            <button class="btn btn-marketplace" onClick={usemodel} disabled={btnValue === model["modelname"]} value={model["modelname"]}>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" hidden={btnValue !== model["modelname"]}></span>
                                Purchase Model</button>
                            <span className='text-white text-decoration-none'>Free 10 Credits</span>
                        </div>
                    </div>
                </div>
            )
        )
    }

    const usemodel = async (e) => {
        setLoading(false)
        e.preventDefault()
        console.log(e.target.value)
        setBtnValue(e.target.value)
        try {
            let modelData = allModels.find(model => model.modelname === e.target.value)
            console.log(modelData)
            let uuid = web3.utils.sha3(modelData.modelname + accounts[0])
            let feeWei = web3.utils.toWei(modelData.modelfee.toString(), 'ether')
            let result = await AIMarketPlace.methods.useModel(modelData.modelname, uuid)
                .send({
                    from: accounts[0],
                    value: feeWei
                })
            let response = await fetch(url + '/addusercredit', {
                method: 'POST',
                headers: {
                    "content-type": "application/json"
                },
                body: JSON.stringify({
                    "model_name": modelData.modelname,
                    "address": accounts[0],
                    "new_credit": 0
                })
            })
            result = response.json()
            setLoading(true)
            setBtnValue('')
            alert("Successfully purchased the model.")
            window.location.reload()
        } catch (error) {
            console.log(error)
            setLoading(true)
            setBtnValue('')
            alert("Something went wrong. Please try again.")
        }


    }

    return (
        <div>
            <LoadingContainer isLoading={isLoading} />
            <div className="m-2">
                <div className='MarketplaceContainer' hidden={!isLoading}>
                    <div className='row'>
                        <div class="col-12">
                            <a className='btn btn-marketplace float-end' href='\createmodel'>
                                Create Your Own Model
                            </a>
                        </div>
                    </div>
                    <NoDeployments isLoading={!isLoading || isModelExists} status={`Model is not deployed yet.`} />
                    <div className='row mb-2' hidden={!isModelExists}>
                        <div class="col-12">
                            <span className='fs-4 fw-light'>All Models</span>
                        </div>
                    </div>
                    <div className='row row-cols-1 row-cols-md-4 g-4'>
                        <Modelcard />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Marketplace