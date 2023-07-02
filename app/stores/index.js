import { createStore, applyMiddleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import thunkMiddleware from 'redux-thunk';

import { loadState, saveState } from '../utils/state';
import { reducer } from '../reducers';

const initialState = loadState();

export const Store = createStore(reducer, initialState, composeWithDevTools(applyMiddleware(thunkMiddleware)));

Store.subscribe(() => saveState(Store.getState()));
