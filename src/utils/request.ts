import ky from 'ky'

export const ExternalApi = async (path: string, json: {} = {}) =>
  new Promise<any>(async (resolve, reject) => {
    try {
      let data = await ky
        .post(`${process.env.API_EXTERNAL}${path}`, {
          timeout: 1000 * 10,
          json,
        })
        .json()
      resolve(data)
    } catch (e) {
      console.error(`error external api: ${path} = ${e}`)
      reject(e)
    }
  })
