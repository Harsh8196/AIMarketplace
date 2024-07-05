import web3 from './web3_'
import Verifier from '../abi/Verifier.json'


const instance = new web3.eth.Contract(Verifier,process.env.REACT_APP_VERIFIER_ADDRESS)  

// console.log(instance)

export default instance