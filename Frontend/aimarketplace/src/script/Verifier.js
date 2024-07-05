import web3 from './web3_'
import Verifier from '../abi/Verifier.json'


const instance = new web3.eth.Contract(Verifier,'0x9946c6616F9e53b102D21b3Ba695ff1695a1D479')  

// console.log(instance)

export default instance