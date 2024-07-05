import React, { useEffect, useState } from 'react'
import MetaMaskOnboarding from '@metamask/onboarding';
import '../css/MyModel.css'
import { Link } from 'react-router-dom';
import AIMarketPlace from '../script/AIMarketPlace'
import web3 from '../script/web3_'
import { ModelDeployments, LoadingContainer } from "./Loading"

const projectId = process.env.REACT_APP_PROJECTID;
const projectSecret = process.env.REACT_APP_PROJECTSECRET;
const url = process.env.REACT_APP_BACKEND_URL;

function MyModel() {
    const [accounts, setAccounts] = useState('');
    const [isLoading, setIsLoading] = useState(true)
    const [allMyModels, setAllMyModels] = useState([])
    const [allPurchaseModels, setAllPurchaseModels] = useState([])
    const [loading, setLoading] = useState(true)
    const [isMyModelExists, setIsMyModelExists] = useState(false)
    const [isPurchaseModelExists, setIsPurchaseModelExists] = useState(false)

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
        if (accounts.length > 0) {
            getAllMyModels()
            getAllPurchaseModels()
        }

    }, [accounts])

    const getAllMyModels = async () => {
        setIsLoading(false);
        try {
            let modelResult = await AIMarketPlace.methods.getCreatorModel(accounts[0]).call()
            let models = []
            console.log(modelResult)
            if (modelResult.length > 0) {
                
                for (let i = 0; i < modelResult.length; i++) {
                    console.log(i,modelResult[i])
                    let result = await AIMarketPlace.methods.getModel(modelResult[i]).call()
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
                setAllMyModels(models)
                setIsMyModelExists(true)
            } else {
                setIsMyModelExists(false)
            }
            setIsLoading(true)
        } catch (error) {
            console.log(error)
            setIsLoading(true)
        }
    }

    const getAllPurchaseModels = async () => {
        setIsLoading(false);
        try {
            let modelResult = await AIMarketPlace.methods.getUserModel(accounts[0]).call()
            let models = []
            console.log(modelResult)
            
            if (modelResult.length > 0) {

                for (let i = 0; i < modelResult.length; i++) {
                    let UUID = modelResult[i]
                    let modeluseObj = await AIMarketPlace.methods.getDetailsUUID(modelResult[i]).call()
                    console.log(modeluseObj)
                    let result = await AIMarketPlace.methods.getModel(modeluseObj.modelname).call()
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
                    response = await fetch(url + '/userbalance?model_name=' + modeluseObj.modelname + '&address=' + accounts[0])
                    let balance = await response.json()
                    let modelObj = {
                        'modelname': data.modelName,
                        'modeldesc': data.modelDesc,
                        'modeltype': data.modelType + ' Ready Model',
                        'modelfee': web3.utils.fromWei(data.modelFee, 'ether'),
                        'creator': result['creator'],
                        'verifier': result['verifier'],
                        'onChainReq': balance["res"]["onChainReq"],
                        'offChainReq': balance["res"]["offChainReq"],
                        'totalReq': balance["res"]["totalReq"],
                        'uuid':UUID
                    }
                    models.push(modelObj)
                }
                console.log(models)
                setAllPurchaseModels(models)
                setIsPurchaseModelExists(true)
            } else {
                setIsPurchaseModelExists(false)
            }
            setIsLoading(true)
        } catch (error) {
            console.log(error)
            setIsLoading(true)
        }
    }

    const MyModelcard = () => {
        return (
            allMyModels.map((model, index) =>
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
                            <div className="row flex-grow-1">
                                <div className="col-12 d-flex flex-column justify-content-between">
                                    <p className="product-summary"> {model["modeldesc"]} </p>
                                </div>
                            </div>
                        </div>
                        <div className="row d-flex justify-content-between">
                            <div className="col-12 ms-2">
                                <div className='fw-ligh'> Verifier Address</div>
                            </div>
                        </div>
                        <div className="row d-flex justify-content-between">
                            <div className="col-12 ms-2">
                                <div className="product-type">{model["verifier"]}</div>
                            </div>
                        </div>
                        <div className="card-footer d-flex justify-content-center rounded-bottom-4 align-items-center">
                            <span className='text-white text-decoration-none'>Model is purchased {model["modelUseCount"]} times</span>
                        </div>
                    </div>
                </div>
            )
        )
    }
    const MyPurchasecard = () => {
        return (
            allPurchaseModels.map((model, index) =>
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
                            <div className="row flex-grow-1">
                                <div className="col-12 d-flex flex-column justify-content-between">
                                    <p className="product-summary"> {model["modeldesc"]} </p>
                                </div>
                            </div>
                        </div>
                        <div className="row d-flex justify-content-between">
                            <div className="col-8 ms-2">
                                <div className='fw-ligh'> Total Credit </div>
                            </div>
                            <div className="col-3">
                                <div className="product-type"> {model["totalReq"]} </div>
                            </div>
                        </div>
                        <div className="row d-flex justify-content-between">
                            <div className="col-8 ms-2">
                                <div className='fw-ligh'> Available Credit </div>
                            </div>
                            <div className="col-3">
                                <div className="product-type"> {parseInt(model["totalReq"]) - parseInt(model["offChainReq"])} </div>
                            </div>
                        </div>
                        <div className="row d-flex justify-content-between">
                            <div className="col-12 ms-2">
                                <div className='fw-ligh'> Verifier </div>
                            </div>
                        </div>
                        <div className="row mt-1 d-flex justify-content-between">
                            <div className="col-12 ms-2">
                                <div className="product-type">{model["verifier"]}</div>
                            </div>
                        </div>
                        <div className="card-footer d-flex justify-content-between rounded-bottom-4 align-items-center">
                            <Link class="btn btn-marketplace" to={`/buycredit/`+model["modelname"]+ `/`+model["uuid"]} >Buy Credit</Link>
                            <Link className='text-white text-decoration-none' to='/swaggerui'>API Details</Link>
                        </div>
                    </div>
                </div>
            )
        )
    }

    return (
        <div>
            <LoadingContainer isLoading={isLoading} />
            <div className="m-2" hidden={!isLoading}>
                <div className='MyModelContainer'>
                    <div className='row mb-2'>
                        <div class="col-12">
                            <span className='fs-4 fw-light'>My Models</span>
                        </div>
                    </div>
                    <ModelDeployments isLoading={!isLoading || isMyModelExists} status={"You haven't deployed any model on Marketplace."} />
                    <div className='row row-cols-1 row-cols-md-4 g-4' hidden={!isMyModelExists}>
                        <MyModelcard />
                    </div>
                    <hr class="mt-2 mb-2" />
                    <div className='row mb-2'>
                        <div class="col-12">
                            <span className='fs-4 fw-light'>Purchased Model</span>
                        </div>
                    </div>
                    <ModelDeployments isLoading={!isLoading || isPurchaseModelExists} status={"You haven't purchased any model from Marketplace."} />
                    <div className='row row-cols-1 row-cols-md-4 g-4' hidden={!isPurchaseModelExists}>
                        <MyPurchasecard/>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MyModel