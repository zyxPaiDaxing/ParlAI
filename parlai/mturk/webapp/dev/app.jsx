/*
 * Copyright (c) 2017-present, Facebook, Inc.
 * All rights reserved.
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import {ToggleButtonGroup, ToggleButton, Button, FormControl,
  ButtonGroup, ButtonToolbar, Panel, Table, Modal, InputGroup,
  Nav, NavItem} from 'react-bootstrap';
import {BaseFrontend, getCorrectComponent, setCustomComponents} from './task_components/core_components.jsx';
import ReactTable from "react-table";
import 'react-table/react-table.css';
import 'fetch';
import $ from 'jquery';

// TODO split components into other files, this app is getting complex

// Init display components
setCustomComponents({});

var AppURLStates = Object.freeze({
  init:0, home:1, unsupported:2, runs:3, workers:4, assignments:5, tasks: 6,
});

function convert_time(timestamp){
  var a = new Date(timestamp * 1000);
  var time = (a.toLocaleDateString("en-US") + ' ' +
              a.toLocaleTimeString("en-US"));
  return time;
}

function resolveState(state_string) {
  if (state_string == '') {
    return {url_state: AppURLStates.init, args: null};
  }
  var args = state_string.split('/');
  var state = {
    url_state: AppURLStates.unsupported,
    args: null,
  };
  if (AppURLStates.hasOwnProperty(args[0])) {
    state.url_state = AppURLStates[args[0]];
  }
  if (args.length > 1) {
    state.args = args.slice(1);
  }
  return state;
}

function postData(url = ``, data = {}) {
  return fetch(url, {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      credentials: "same-origin",
      headers: {
          "Content-Type": "application/json; charset=utf-8",
      },
      redirect: "follow",
      referrer: "no-referrer",
      body: JSON.stringify(data),
  });
}

// Custom message component shows context if it exists:
class ChatMessage extends React.Component {
  render() {
    if (this.props.agent_id == 'persona' || this.props.agent_id == 'setting') {
      return (
        <div className={"row"} style={{'marginLeft': '0', 'marginRight': '0'}}>
          <div
            className={"alert " + 'alert-info'} role="alert"
            style={{'float': 'left', 'display': 'table'}}>
            <span style={{'fontSize': '16px'}}>
              <b>{this.props.agent_id}</b>: {this.props.context}
              {context}
            </span>
          </div>
        </div>
      );
    }
    let float_loc = 'left';
    let alert_class = 'alert-warning';
    if (this.props.is_self) {
      float_loc = 'right';
      alert_class = 'alert-info';
    }
    let context = null;
    let duration = null;
    if (this.props.context !== undefined && this.props.context.length > 0) {
      context = <span><br /><b>Action: </b><i>{this.props.context}</i></span>;
    }
    if (this.props.duration !== undefined) {
      let duration_seconds = Math.floor(this.props.duration / 1000) % 60;
      let duration_minutes = Math.floor(this.props.duration / 60000);
      let min_text = duration_minutes > 0 ? duration_minutes + ' min' : '';
      let sec_text = duration_seconds > 0 ? duration_seconds + ' sec' : '';
      duration = <small>
        <br /><i>Duration: </i>{min_text + ' ' + sec_text}
      </small>;
    }
    return (
      <div className={"row"} style={{'marginLeft': '0', 'marginRight': '0'}}>
        <div
          className={"alert " + alert_class} role="alert"
          style={{'float': float_loc, 'display': 'table'}}>
          <span style={{'fontSize': '16px'}}>
            <b>{this.props.agent_id}</b>: {this.props.message}
            {context}
            {duration}
          </span>
        </div>
      </div>
    );
  }
}

class ChatDisplay extends React.Component {
  render() {
    var display_text = this.props.is_onboarding ? 'Onboarding' : 'Task';
    let XMessageList = getCorrectComponent('XMessageList', this.props.agent_id);
    return (
      <Panel
        id="message_display_div"
        bsStyle="info"
        defaultExpanded>
        <Panel.Heading>
          <Panel.Title componentClass="h3" toggle>
            {display_text} Chat Window
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body style={{maxHeight: '600px', overflow: 'scroll'}}>
            <XMessageList
              v_id={this.props.agent_id}
              messages={this.props.messages}
              agent_id={this.props.agent_id}
              is_review={true}/>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    );
  }
}

class NavLink extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    if (this.props.type == 'run') {
      return (
        <a href={'/app/runs/' + this.props.target}>
          {this.props.children}
        </a>
      );
    } else if (this.props.type == 'worker') {
      return (
        <a href={'/app/workers/' + this.props.target}>
          {this.props.children}
        </a>
      );
    } else if (this.props.type == 'assignment') {
      return (
        <a href={'/app/assignments/' + this.props.target}>
          {this.props.children}
        </a>
      );
    } else if (this.props.type == 'task') {
      return (
        <a href={'/app/tasks/' + this.props.target}>
          {this.props.children}
        </a>
      );
    } else {
      return (
        <span>{this.props.children}</span>
      )
    }
  }
}

class SharedTable extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    var used_cols = this.props.used_cols;
    var row_formatter = (
      used_cols.map(this.props.getColumnFormatter, this.props));
    return (
      <Panel id={this.props.title} defaultExpanded>
        <Panel.Heading>
          <Panel.Title componentClass="h3">
            {this.props.title}
          </Panel.Title>
        </Panel.Heading>
        <Panel.Body style={{padding: '0px'}}>
          <ReactTable
            className='-striped -highlight'
            showPagination={this.props.data.length > 20}
            sortable={this.props.data.length > 1}
            filterable={false}
            minRows="1"
            columns={row_formatter}
            {...this.props}
          />
        </Panel.Body>
      </Panel>
    )
  }
}

class RunTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {used_cols: [
      'run_id', 'run_status', 'created', 'maximum', 'completed', 'failed',
    ]};
  }

  getColumnFormatter(row_name) {
    return {
      id: row_name,
      Header: props => this.getHeaderValue(row_name),
      accessor: item => this.getColumnValue(row_name, item),
      Cell: props => this.getColumnCell(row_name, props),
    };
  }

  getHeaderValue(header_name) {
    switch(header_name) {
      case 'run_id':
        return <span>Run ID</span>;
      case 'run_status':
        return <span>Status</span>;
      case 'created':
        return <span>Created</span>;
      case 'maximum':
        return <span>Maximum</span>;
      case 'completed':
        return <span>Completed</span>;
      case 'failed':
        return <span>Failed</span>;
      default:
        return <span>Invalid column {header_name}</span>;
    }
  }

  getColumnCell(header_name, props) {
    // TODO add table row/icon for `notes` that appear on hover
    switch(header_name) {
      case 'run_id':
        return <NavLink type='run' target={props.row.run_id}>
          {props.value}
        </NavLink>;
      case 'run_status':
      case 'created':
      case 'maximum':
      case 'completed':
      case 'failed':
      default:
        return <span>{props.value}</span>;
    }
  }

  getColumnValue(header_name, item) {
    switch(header_name) {
      case 'run_id': return item.run_id;
      case 'run_status': return item.run_status;
      case 'created': return item.created;
      case 'maximum': return item.maximum;
      case 'completed': return item.completed;
      case 'failed': return item.failed;
      default: return 'Invalid column ' + header_name;
    }
  }

  render() {
    return (
      <SharedTable
        getColumnFormatter={this.getColumnFormatter.bind(this)}
        used_cols={this.state.used_cols}
        data={this.props.data}
        title={this.props.title}
      />
    );
  }
}

class TaskTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {used_cols: [
      'task_name', 'internal', 'react_frontend', 'has_custom', 'active_runs',
      'all_runs', 'dir',
    ]};
  }

  getColumnFormatter(row_name) {
    return {
      id: row_name,
      Header: props => this.getHeaderValue(row_name),
      accessor: item => this.getColumnValue(row_name, item),
      Cell: props => this.getColumnCell(row_name, props),
    };
  }

  getHeaderValue(header_name) {
    switch(header_name) {
      case 'task_name':
        return <span>Task Name</span>;
      case 'internal':
        return <span>Internal</span>;
      case 'react_frontend':
        return <span>Demoable</span>;
      case 'has_custom':
        return <span>Custom Components</span>;
      case 'active_runs':
        return <span>Active Runs</span>;
      case 'all_runs':
        return <span>Total Runs</span>;
      case 'dir':
        return <span>Task Directory</span>;
      default:
        return <span>Invalid column {header_name}</span>;
    }
  }

  getColumnCell(header_name, props) {
    // TODO add table row/icon for `notes` that appear on hover
    switch(header_name) {
      case 'task_name':
        return <NavLink type='task' target={props.row.task_name}>
          {props.value}
        </NavLink>;
      case 'internal':
      case 'react_frontend':
      case 'has_custom':
        return <span>{props.value ? 'Yes' : 'No'}</span>;
      case 'active_runs':
      case 'all_runs':
      case 'dir':
      default:
        return <span>{props.value}</span>;
    }
  }

  getColumnValue(header_name, item) {
    switch(header_name) {
      case 'task_name': return item.task_name;
      case 'internal': return item.internal;
      case 'react_frontend': return item.react_frontend;
      case 'has_custom': return item.has_custom;
      case 'active_runs': return item.active_runs;
      case 'all_runs': return item.all_runs;
      case 'dir': return item.dir;
      default: return 'Invalid column ' + header_name;
    }
  }

  render() {
    return (
      <SharedTable
        getColumnFormatter={this.getColumnFormatter.bind(this)}
        used_cols={this.state.used_cols}
        data={this.props.data}
        title={this.props.title}
      />
    );
  }
}

class HitTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {used_cols: [
      'hit_id', 'expiration', 'hit_status', 'assignments_pending',
      'assignments_available', 'assignments_complete',
    ]};
  }

  getColumnFormatter(row_name) {
    return {
      id: row_name,
      Header: props => this.getHeaderValue(row_name),
      accessor: item => this.getColumnValue(row_name, item),
      Cell: props => this.getColumnCell(row_name, props),
    };
  }

  getHeaderValue(header_name) {
    switch(header_name) {
      case 'hit_id':
        return <span>HIT ID</span>;
      case 'expiration':
        return <span>Expiration</span>;
      case 'hit_status':
        return <span>HIT Status</span>;
      case 'assignments_pending':
        return <span>Pending</span>;
      case 'assignments_available':
        return <span>Available</span>;
      case 'assignments_complete':
        return <span>Complete</span>;
      default:
        return <span>Invalid column {header_name}</span>;
    }
  }

  getColumnCell(header_name, props) {
    // TODO add table row/icon for `notes` that appear on hover
    switch(header_name) {
      case 'hit_id':
        return <NavLink type='hit' target={props.row.hit_id}>
          {props.value}
        </NavLink>;
      case 'expiration':
      case 'hit_status':
      case 'assignments_pending':
      case 'assignments_available':
      case 'assignments_complete':
      default:
        return <span>{props.value}</span>;
    }
  }

  getColumnValue(header_name, item) {
    switch(header_name) {
      case 'hit_id': return item.hit_id;
      case 'expiration':
        if (item.expiration > 0) {
          return convert_time(item.expiration);
        } else {
          return 'No expiration recorded';
        }
      case 'hit_status': return item.hit_status;
      case 'assignments_pending': return item.assignments_pending;
      case 'assignments_available': return item.assignments_available;
      case 'assignments_complete': return item.assignments_complete;
      default: return 'Invalid column ' + header_name;
    }
  }

  render() {
    return (
      <SharedTable
        getColumnFormatter={this.getColumnFormatter.bind(this)}
        used_cols={this.state.used_cols}
        data={this.props.data}
        title={this.props.title}
      />
    );
  }
}

class AssignmentTable extends React.Component {
  constructor(props) {
    super(props);
    // TODO additional rows conversation_id, bonus_text,
    this.state = {used_cols: [
      'assignment_id', 'worker_id', 'task_status', 'world_status',
      'approve_time', 'onboarding_start', 'onboarding_end', 'task_start',
      'task_end', 'bonus_amount', 'bonus_paid', 'hit_id', 'run_id',
    ]};
  }

  getColumnFormatter(row_name) {
    return {
      id: row_name,
      Header: props => this.getHeaderValue(row_name),
      accessor: item => this.getColumnValue(row_name, item),
      Cell: props => this.getColumnCell(row_name, props),
    };
  }

  getHeaderValue(header_name) {
    switch(header_name) {
      case 'assignment_id':
        return <span>Assignment ID</span>;
      case 'worker_id':
        return <span>Worker ID</span>;
      case 'task_status':
        return <span>Task Status</span>;
      case 'world_status':
        return <span>World Status</span>;
      case 'approve_time':
        return <span>Approve By</span>;
      case 'onboarding_start':
        return <span>Onboarding Start</span>;
      case 'onboarding_end':
        return <span>Onboarding End</span>;
      case 'task_start':
        return <span>Task Start</span>;
      case 'task_end':
        return <span>Task End</span>;
      case 'bonus_amount':
        return <span>Bonus Amount</span>;
      case 'bonus_paid':
        return <span>Bonus Paid</span>;
      case 'hit_id':
        return <span>HIT ID</span>;
      case 'run_id':
        return <span>Run ID</span>;
      default:
        return <span>Invalid column {header_name}</span>;
    }
  }

  getColumnCell(header_name, props) {
    // TODO add table row/icon for `notes` that appear on hover
    switch(header_name) {
      case 'assignment_id':
        return <NavLink type='assignment' target={props.row.assignment_id}>
          {props.value}
        </NavLink>;
      case 'worker_id':
        return <NavLink type='worker' target={props.row.worker_id}>
          {props.value}
        </NavLink>;
      case 'hit_id':
        return <NavLink type='hit' target={props.row.hit_id}>
          {props.value}
        </NavLink>;
      case 'run_id':
        return <NavLink type='run' target={props.row.run_id}>
          {props.value}
        </NavLink>;
      case 'task_status':
      case 'world_status':
      case 'approve_time':
      case 'onboarding_start':
      case 'onboarding_end':
      case 'task_start':
      case 'task_end':
      case 'bonus_amount':
      case 'bonus_paid':
      default:
        return <span>{props.value}</span>;
    }
  }

  getColumnValue(header_name, item) {
    switch(header_name) {
      case 'assignment_id': return item.assignment_id;
      case 'worker_id': return item.worker_id;
      case 'task_status': return item.status;
      case 'world_status': return item.world_status;
      case 'approve_time':
        if (item.approve_time > 0) {
          return convert_time(item.approve_time);
        } else {
          return 'Not completed';
        }
      case 'onboarding_start':
        if (item.onboarding_start > 0) {
          return convert_time(item.onboarding_start);
        } else {
          return 'No onboarding';
        }
      case 'onboarding_end':
        if (item.onboarding_end > 0) {
          return convert_time(item.onboarding_end);
        } else {
          return' Never entered task queue';
        }
      case 'task_start':
        if (item.task_start > 0) {
          return convert_time(item.task_start);
        } else {
          return 'Never started task';
        }
      case 'task_end':
        if (item.task_end > 0) {
          return convert_time(item.task_end);
        } else {
          return 'Never finished task';
        }
      case 'bonus_amount': return item.bonus_amount;
      case 'bonus_paid': return item.bonus_paid;
      case 'hit_id': return item.hit_id;
      case 'run_id': return item.run_id;
      default: return 'Invalid column ' + header_name;
    }
  }

  render() {
    return (
      <SharedTable
        getColumnFormatter={this.getColumnFormatter.bind(this)}
        used_cols={this.state.used_cols}
        data={this.props.data}
        title={this.props.title}
      />
    );
  }
}

class WorkerTable extends React.Component {
  constructor(props) {
    super(props);
    // TODO additional rows conversation_id, bonus_text,
    this.state = {used_cols: [
      'worker_id', 'accepted', 'disconnected', 'completed',
      'approved', 'rejected',
    ]};
  }

  getColumnFormatter(row_name) {
    return {
      id: row_name,
      Header: props => this.getHeaderValue(row_name),
      accessor: item => this.getColumnValue(row_name, item),
      Cell: props => this.getColumnCell(row_name, props),
    };
  }

  getHeaderValue(header_name) {
    switch(header_name) {
      case 'worker_id':
        return <span>Worker ID</span>;
      case 'accepted':
        return <span>Accepted</span>;
      case 'disconnected':
        return <span>Disconnected</span>;
      case 'completed':
        return <span>Completed</span>;
      case 'approved':
        return <span>Approved</span>;
      case 'rejected':
        return <span>Rejected</span>;
      default:
        return <span>Invalid column {header_name}</span>;
    }
  }

  getColumnCell(header_name, props) {
    switch(header_name) {
      case 'worker_id':
        return <NavLink type='worker' target={props.row.worker_id}>
          {props.value}
        </NavLink>;
      case 'accepted':
      case 'disconnected':
      case 'completed':
      case 'approved':
      case 'rejected':
      default:
        return <span>{props.value}</span>;
    }
  }

  getColumnValue(header_name, item) {
    switch(header_name) {
      case 'worker_id': return item.worker_id;
      case 'accepted': return item.accepted;
      case 'disconnected': return item.disconnected;
      case 'completed': return item.completed;
      case 'approved': return item.approved;
      case 'rejected': return item.rejected;
      default: return 'Invalid column ' + header_name;
    }
  }

  render() {
    return (
      <SharedTable
        getColumnFormatter={this.getColumnFormatter.bind(this)}
        used_cols={this.state.used_cols}
        data={this.props.data}
        title={this.props.title}
      />
    );
  }
}

class RunPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {run_loading: true, items: null, error: false};
  }

  fetchRunData() {
    fetch('/runs/' + this.props.run_id)
      .then(res => res.json())
      .then(
        (result) => {
          this.setState({
            run_loading: false,
            data: result
          });
        },
        (error) => {
          this.setState({
            run_loading: false,
            error: true
          });
        }
      )
  }

  componentDidMount() {
    this.setState({run_loading: true});
    this.fetchRunData();
  }

  renderRunInfo() {
    return (
      <div>
        <RunTable
          data={[this.state.data.run_details]}
          title={'Baseline info for this run'}/>
        <AssignmentTable
          data={this.state.data.assignments}
          title={'Assignments from this run'}/>
        <HitTable
          data={this.state.data.hits}
          title={'HITs from this run'}/>
      </div>
    )
  }

  render() {
    var content;
    if (this.state.run_loading) {
      content = <span>Run details are currently loading...</span>;
    } else if (this.state.error !== false) {
      content = <span>Run loading failed, perhaps run doesn't exist?</span>;
    } else {
      content = this.renderRunInfo();
    }

    return (
      <Panel>
        <Panel.Heading>
          <Panel.Title componentClass="h3">
            Task Details - Run: {this.props.run_id}
          </Panel.Title>
        </Panel.Heading>
        <Panel.Body>
          {content}
        </Panel.Body>
      </Panel>
    )
  }
}

class AssignmentFeedback extends React.Component {
  render() {
    let review_data = this.props.data.task.data;
    var content = null;
    var bsStyle = null;
    let given_feedback = null;
    let received_feedback = null;
    if (review_data !== undefined) {
      given_feedback = review_data.given_feedback;
      received_feedback = review_data.received_feedback;
    }
    if (!given_feedback && !received_feedback) {
      content = "No feedback is associated with this assignment."
      bsStyle = "default"
    } else {
      let XReviewButtons = getCorrectComponent('XReviewButtons', null);
      let given_feedback_content = <span>No provided feedback</span>;
      if (given_feedback !== undefined) {
        let init_state = {
          'current_rating': given_feedback.rating,
          'submitting': true,
          'submitted': true,
          'text': given_feedback.reason,
          'dropdown_value': given_feedback.reason_category,
        };
        given_feedback_content = <XReviewButtons init_state={init_state} />;
      }
      let received_feedback_content = <span>No provided feedback</span>;
      if (received_feedback !== undefined) {
        let init_state = {
          'current_rating': received_feedback.rating,
          'submitting': true,
          'submitted': true,
          'text': received_feedback.reason,
          'dropdown_value': received_feedback.reason_category,
        };
        received_feedback_content = <XReviewButtons init_state={init_state} />;
      }
      content = <div>
        <h1>Given feedback</h1>
        {given_feedback_content}
        <h1>Received feedback</h1>
        {received_feedback_content}
      </div>;
      bsStyle = "info"
    }

    return (
      <Panel
        id="assignment_instruction_div"
        bsStyle={bsStyle}
        defaultExpanded={!!(given_feedback || received_feedback)}>
        <Panel.Heading>
          <Panel.Title componentClass="h3" toggle>
            Feedback
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
            {content}
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    );
  }
}

class AssignmentInstructions extends React.Component {
  render() {
    let instructions = this.props.data;
    var content = null;
    var bsStyle = null;
    if (instructions === null) {
      content = "No task details could be found for this assignment."
      bsStyle = "default"
    } else {
      let XTaskDescription = getCorrectComponent('XTaskDescription', null);
      content = <XTaskDescription task_description={instructions} />;
      bsStyle = "info"
    }

    return (
      <Panel
        id="assignment_instruction_div"
        bsStyle={bsStyle}>
        <Panel.Heading>
          <Panel.Title componentClass="h3" toggle>
            Task Instructions
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
            {content}
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    );
  }
}

class BlockModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {reason: '', submitting: false};
  }

  submitBlock() {
    this.setState({submitting: true});
    postData('/block/' + this.props.worker_id,
          {'reason': this.state.reason,
           'assignment_id': this.props.assignment_id})
      .then(res => res.json())
      .then(
        (result) => {
          this.setState({
            submitting: false,
          });
          this.props.onHide();
          this.props.onAssignmentUpdate();
        },
        (error) => {
          this.setState({
            submitting: false,
          });
          console.log(error);
          window.alert('Submitting block failed. Error logged to console');
        }
      )
  }

  render() {
    var block_reason_input = (
      <span>
        Why are you blocking this worker?
        <FormControl
          type="text"
          componentClass="textarea"
          value={this.state.reason}
          placeholder="Enter reason"
          onChange={(e) => this.setState({reason: e.target.value})}/>
      </span>
    );

    var {onAssignmentUpdate, ...others} = this.props;

    return (
      <Modal
        {...others}
        aria-labelledby="block-worker-modal-title-block">
        <Modal.Header closeButton>
          <Modal.Title id="block-worker-modal-title-block">
            Block Worker
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to block worker {this.props.worker_id}?
          <br/>
          {block_reason_input}
        </Modal.Body>
        <Modal.Footer>
          <ButtonToolbar>
            <Button
              bsStyle='primary'
              onClick={() => this.submitBlock()}
              disabled={this.state.submitting || this.state.reason == ''}>
                Block
              </Button>
            <Button onClick={this.props.onHide}>Cancel</Button>
          </ButtonToolbar>
        </Modal.Footer>
      </Modal>
    );
  }
}

class BonusModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = this.getClearState();
  }

  getClearState() {
    return {reason: '', dollars: '', cents: '', submitting: false,
      bonus_token: Math.random().toString(36).substr(2, 9)};
  }

  submitBonus() {
    this.setState({submitting: true});
    var cents = this.state.cents != '' ? this.state.cents : 0;
    var dollars = this.state.dollars != '' ? this.state.dollars : 0;
    var use_amount = dollars * 100 + cents;
    postData('/bonus/' + this.props.worker_id,
          {'reason': this.state.reason,
           'bonus_cents': use_amount,
           'assignment_id': this.props.assignment_id,
           'bonus_token': this.state.bonus_token})
      .then(res => res.json())
      .then(
        (result) => {
          this.setState(this.getClearState());
          this.props.onHide();
          this.props.onAssignmentUpdate();
        },
        (error) => {
          this.setState({
            submitting: false,
          });
          console.log(error);
          window.alert('Submitting bonus failed. Error logged to console');
        }
      )
  }

  updateDollars(amount) {
    if (amount < 0 || (amount != '' && isNaN(amount))) {
      return;
    }
    amount = amount == '' ? 0 : amount;
    this.setState({dollars: +amount})
  }

  updateCents(amount) {
    if (amount < 0 || amount > 99 || (amount != '' && isNaN(amount))) {
      return;
    }
    amount = amount == '' ? 0 : amount;
    this.setState({cents: +amount})
  }

  render() {
    var cents = this.state.cents;
    var display_cents =  cents < 10 ? '0' + cents : cents;
    var bonus_detail_form = (
      <div>
        How much do you want to bonus?
        <InputGroup>
          <InputGroup.Addon>$</InputGroup.Addon>
          <FormControl
            type="text"
            value={this.state.dollars}
            placeholder="0"
            onChange={(e) => this.updateDollars(e.target.value)}/>
          <InputGroup.Addon>.</InputGroup.Addon>
          <FormControl
            type="text"
            value={display_cents}
            placeholder="00"
            onChange={(e) => this.updateCents(e.target.value)}/>
        </InputGroup>
        Why bonus?
        <FormControl
          type="textarea"
          value={this.state.reason}
          placeholder="Enter Reason"
          onChange={(e) => this.setState({reason: e.target.value})}/>
      </div>
    );

    var {onAssignmentUpdate, ...others} = this.props;

    return (
      <Modal
        {...others}
        aria-labelledby="bonus-modal-title-block">
        <Modal.Header closeButton>
          <Modal.Title id="bonus-modal-title-block">
            Bonus Worker
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Bonusing worker {this.props.worker_id} for assignment {this.props.assignment_id}.
          <br/>
          {bonus_detail_form}
        </Modal.Body>
        <Modal.Footer>
          <ButtonToolbar>
            <Button bsStyle='primary' onClick={() => this.submitBonus()}>Bonus</Button>
            <Button onClick={this.props.onHide}>Cancel</Button>
          </ButtonToolbar>
        </Modal.Footer>
      </Modal>
    );
  }
}

class ReviewButtonGroup extends React.Component {
  // This component renders a group that can approve or reject a hit.
  // It handles overriding rejections, as well as displaying accepted status
  // (which cannot be reviewed)
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
    this.state = {
      value: this.getGivenStateVal(),
      submitting: false,
      reason: '',
    };
  }

  getGivenStateVal() {
    if (this.props.status == 'Approved') {
      return 0;
    } else if (this.props.status == 'Rejected') {
      return 1;
    }
    return null;
  }

  handleChange(e) {
    this.setState({value: e});
  }

  confirmReview() {
    var endpoint = ['approve','reject'][this.state.value];
    this.setState({submitting: true});
    postData('/'+ endpoint + '/' + this.props.assignment_id,
          {'reason': this.state.reason})
      .then(res => res.json())
      .then(
        (result) => {
          this.setState({
            submitting: false,
          });
          this.props.onUpdate();
        },
        (error) => {
          this.setState({
            submitting: false,
          });
          console.log(error);
          window.alert('Submitting review failed. Error logged to console');
        }
      )
  }

  reverseRejection() {
    this.setState({submitting: true});
    fetch('/reverse_rejection/' + this.props.assignment_id, {method: "POST"})
      .then(res => res.json())
      .then(
        (result) => {
          this.setState({
            submitting: false,
          });
          this.props.onUpdate();
        },
        (error) => {
          this.setState({
            submitting: false,
          });
          console.log(error);
          window.alert('Submitting review failed. Error logged to console');
        }
      )
  }

  render() {
    var confirm_seg = null;
    var picker = null;
    if (this.getGivenStateVal() === null) {
      var button_styles = ['default', 'default'];
      var reject_reason_input = null;
      if (this.state.value === null) {
        confirm_seg = (
          <ButtonGroup>
            <Button disabled>
              Confirm
            </Button>
          </ButtonGroup>
        );
      } else {
        var confirm_disabled = this.state.submitting || (
          this.state.value == 1 && this.state.reason == '');
        confirm_seg = (
          <ButtonGroup>
            <Button
              bsStyle='primary'
              onClick={() => this.confirmReview()}
              disabled={confirm_disabled}>
              Confirm
            </Button>
          </ButtonGroup>
        );
        if (this.state.value == 0) {
          button_styles[0] = 'success';
        } else {
          button_styles[1] = 'danger';
          reject_reason_input = (
            <span>
              Why reject?
              <FormControl
                type="text"
                value={this.state.reason}
                placeholder="Enter text"
                onChange={(e) => this.setState({reason: e.target.value})}/>
            </span>
          );
        }
      }
      var picker = (
        <ToggleButtonGroup
          type="radio"
          name="approval_status"
          value={this.state.value}
          onChange={this.handleChange}>
          <ToggleButton
            value={0}
            bsStyle={button_styles[0]}>
            Approve
          </ToggleButton>
          <ToggleButton
            value={1}
            bsStyle={button_styles[1]}>
            Reject
          </ToggleButton>
        </ToggleButtonGroup>
      );
    } else if (this.getGivenStateVal() === 1) {
      var button_styles = ['default', 'default'];
      if (this.state.value === 1) {
        confirm_seg = (
          <ButtonGroup>
            <Button disabled>
              Confirm
            </Button>
          </ButtonGroup>
        );
        button_styles[1] = 'danger';
      } else {
        confirm_seg = (
          <ButtonGroup>
            <Button bsStyle='primary' onClick={() => this.reverseRejection()}>
              Confirm Reverse Rejection
            </Button>
          </ButtonGroup>
        );
        button_styles[0] = 'success';
      }
      var picker = (
        <ToggleButtonGroup
          type="radio"
          name="approval_status"
          value={this.state.value}
          onChange={this.handleChange}>
          <ToggleButton
            value={0}
            bsStyle={button_styles[0]}>
            Approve
          </ToggleButton>
          <ToggleButton
            value={1}
            bsStyle={button_styles[1]}>
            Rejected
          </ToggleButton>
        </ToggleButtonGroup>
      );
    } else {
      var picker = (
        <ButtonGroup>
          <Button bsStyle='success' disabled>
            Approved
          </Button>
        </ButtonGroup>
      );
    }

    return (
      <div>
        <ButtonToolbar>
          {picker}
          {confirm_seg}
        </ButtonToolbar>
        {reject_reason_input}
      </div>
    );
  }
}

class AssignmentReviewer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      block_show: false,
      bonus_show: false,
    };
  }

  getReviewSet() {
    return (
      <ReviewButtonGroup
        status={this.props.data.status}
        onUpdate={this.props.onUpdate}
        assignment_id={this.props.data.assignment_id}/>
    );
  }

  getActionButtons() {
    let blockClose = () => this.setState({ block_show: false });
    let bonusClose = () => this.setState({ bonus_show: false });

    return (
      <ButtonToolbar>
        <Button
          bsStyle="success"
          onClick={() => this.setState({ bonus_show: true })}>
          Bonus
        </Button>
        <Button
          bsStyle="danger"
          onClick={() => this.setState({ block_show: true })}>
          Block
        </Button>
        <BlockModal
          show={this.state.block_show}
          onHide={blockClose}
          assignment_id={this.props.data.assignment_id}
          worker_id={this.props.data.worker_id}
          onAssignmentUpdate={this.props.onUpdate}/>
        <BonusModal
          show={this.state.bonus_show}
          onHide={bonusClose}
          worker_id={this.props.data.worker_id}
          assignment_id={this.props.data.assignment_id}
          onAssignmentUpdate={this.props.onUpdate}/>
      </ButtonToolbar>
    );
  }

  render() {
    var panel_body;
    if (this.props.data.world_status != 'done') {
      panel_body = <span>Cannot review until the world is done.</span>;
    } else {
      var review_set = this.getReviewSet();
      var action_buttons = this.getActionButtons();
      panel_body = (
        <Table>
          <thead>
            <tr>
              <th>Review HIT</th>
              <th>Additional Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{review_set}</td>
              <td>{action_buttons}</td>
            </tr>
          </tbody>
        </Table>
      );
    }
    return (
      <Panel
        id="review_control_div"
        bsStyle="success"
        style={{clear: 'both'}}
        defaultExpanded>
        <Panel.Heading>
          <Panel.Title componentClass="h3" toggle>
            Assignment Actions
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
            {panel_body}
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    );
  }

  // Set default props
  static defaultProps = {
    confirm: true,
    data: null
  }
}

class AssignmentView extends React.Component {
  constructor(props) {
    super(props);
    let task_name = props.data.task_name;
    import(
      /* webpackMode: "eager" */
      `./task_components/${task_name}/components/custom.jsx`
    ).then((custom) => {
      this.props.setCustomComponents(custom.default);
    }).catch((err) => {
      // Custom react module not found
      this.props.setCustomComponents({});
    });
  }

  getOnboardingChat() {
    let onboard_data = this.props.data.onboarding;
    if (onboard_data === null) {
      return (
        <Panel id="message_display_div_onboarding">
          <Panel.Heading>
            <Panel.Title componentClass="h3" toggle>
              Onboarding Chat Window
            </Panel.Title>
          </Panel.Heading>
          <Panel.Collapse>
            <Panel.Body>
              This assignment didn't have any onboarding data.
            </Panel.Body>
          </Panel.Collapse>
        </Panel>
      );
    } else {
      return this.getTaskChat(onboard_data, true);
    }
  }

  getTaskChat(task_data, is_onboarding) {
    let error_message = null;
    if (!task_data.had_data_dir) {
      error_message = 'No run_data directory existed in parlai/mturk/core.';
    } else if (!task_data.had_run_dir) {
      error_message = "The directory for the assignment's specific run didn't"+
        " exist in the run_data directory";
    } else if (!task_data.had_conversation_dir) {
      error_message = "The directory for the assignment's conversation didn't"+
        " exist in the run's directory";
    } else if (!task_data.had_worker_dir) {
      error_message = "The directory for the assignment's workers didn't"+
        " exist in the conversation's directory";
    } else if (!task_data.had_worker_file) {
      error_message = "The file for this assignment's worker didn't"+
        " exist in the workers directory";
    } else if (!task_data.data) {
      error_message = "This assignment's chat data file couldn't be read";
    }

    if (error_message !== null) {
      return (
        <div>
          The assignment's chat could not be rendered, reason below.
          <br/>
          {error_message}
        </div>
      );
    } else {
      let messages = task_data.data.messages;
      let agent_id = task_data.data.agent_id;
      return (
        <ChatDisplay
          messages={messages}
          agent_id={agent_id}
          is_onboarding={is_onboarding}/>
      );
    }
  }

  render() {
    let data = this.props.data;
    let onboarding_chat_window = this.getOnboardingChat();
    let task_chat_window = this.getTaskChat(this.props.data.task, false);
    return (
      <div>
        {onboarding_chat_window}
        {task_chat_window}
      </div>
    );
  }
}

class AssignmentPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      assignment_loading: true, items: null, error: false,
      custom_components: {}
    };
  }

  fetchRunData() {
    fetch('/assignments/' + this.props.assignment_id)
      .then(res => res.json())
      .then(
        (result) => {
          this.setState({
            assignment_loading: false,
            data: result
          });
        },
        (error) => {
          this.setState({
            assignment_loading: false,
            error: true
          });
        }
      )
  }

  componentDidMount() {
    this.setState({assignment_loading: true});
    this.fetchRunData();
  }

  renderAssignmentInfo() {
    // TODO move task instructions and context into separate panels for
    // task and onboarding
    return (
      <div>
        <AssignmentTable
          data={[this.state.data.assignment_details]}
          title={'State info for this assignment'}/>
        <div id='left-assign-pane' style={{float: 'left', 'width': '40%'}}>
          <AssignmentInstructions
            data={[this.state.data.assignment_instructions]}
            custom_components={this.state.custom_components}/>
          <AssignmentFeedback
            data={this.state.data.assignment_content}
            custom_components={this.state.custom_components}/>
        </div>
        <div id='right-assign-pane' style={{float: 'right', 'width': '58%'}}>
          <AssignmentView
            data={this.state.data.assignment_content}
            title={'Assignment Content'}
            custom_components={this.state.custom_components}
            setCustomComponents={(module) => {
              setCustomComponents(module);
              this.setState({custom_components: module});
            }}/>
        </div>
        <AssignmentReviewer
          data={this.state.data.assignment_details}
          onUpdate={() => this.fetchRunData()}/>
      </div>
    )
  }

  render() {
    var content;
    if (this.state.assignment_loading) {
      content = <span>Assignment details are currently loading...</span>;
    } else if (this.state.error !== false) {
      content = (
        <span>
          Assignment loading failed, perhaps Assignment doesn't exist?
        </span>
      );
    } else {
      content = this.renderAssignmentInfo();
    }

    return (
      <Panel bsStyle="primary">
        <Panel.Heading>
          <Panel.Title componentClass="h3">
            Assignment Details - Assignment: {this.props.assignment_id}
          </Panel.Title>
        </Panel.Heading>
        <Panel.Body>
          {content}
        </Panel.Body>
      </Panel>
    )
  }
}

class WorkerPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {worker_loading: true, items: null, error: false};
  }

  fetchRunData() {
    fetch('/workers/' + this.props.worker_id)
      .then(res => res.json())
      .then(
        (result) => {
          this.setState({
            worker_loading: false,
            data: result
          });
        },
        (error) => {
          this.setState({
            worker_loading: false,
            error: true
          });
        }
      )
  }

  componentDidMount() {
    this.setState({worker_loading: true});
    this.fetchRunData();
  }

  renderRunInfo() {
    return (
      <div>
        <WorkerTable
          data={[this.state.data.worker_details]}
          title={'Worker Stats'}/>
        <AssignmentTable
          data={this.state.data.assignments}
          title={'Assignments from this Worker'}/>
      </div>
    )
  }

  render() {
    var content;
    if (this.state.worker_loading) {
      content = <span>Run details are currently loading...</span>;
    } else if (this.state.error !== false) {
      content = <span>Run loading failed, perhaps run doesn't exist?</span>;
    } else {
      content = this.renderRunInfo();
    }

    return (
      <Panel>
        <Panel.Heading>
          <Panel.Title componentClass="h3">
            Worker Details - Worker: {this.props.worker_id}
          </Panel.Title>
        </Panel.Heading>
        <Panel.Body>
          {content}
        </Panel.Body>
      </Panel>
    )
  }
}

class RunListPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {tasks_loading: true, items: null, error: false};
  }

  fetchRunData() {
    fetch('/run_list')
      .then(res => res.json())
      .then(
        (result) => {
          this.setState({
            tasks_loading: false,
            items: result
          });
        },
        (error) => {
          this.setState({
            tasks_loading: false,
            error: error
          });
        }
      )
  }

  componentDidMount() {
    this.setState({tasks_loading: true});
    this.fetchRunData();
  }

  render() {
    var content;
    if (this.state.tasks_loading) {
      content = <span>Runs are currently loading...</span>;
    } else if (this.state.error !== false) {
      console.log(this.state.error)
      content = <span>Runs loading failed...</span>;
    } else {
      content = <RunTable data={this.state.items} title={'Local Runs'}/>;
    }

    return (
      <Panel>
        <Panel.Heading>
          <Panel.Title componentClass="h3">
            Running Task List
          </Panel.Title>
        </Panel.Heading>
        <Panel.Body>
          {content}
        </Panel.Body>
      </Panel>
    )
  }
}

class TaskListPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {tasks_loading: true, items: null, error: false};
  }

  fetchTaskData() {
    fetch('/task_list')
      .then(res => res.json())
      .then(
        (result) => {
          this.setState({
            tasks_loading: false,
            items: result
          });
        },
        (error) => {
          this.setState({
            tasks_loading: false,
            error: error
          });
        }
      )
  }

  componentDidMount() {
    this.setState({tasks_loading: true});
    this.fetchTaskData();
  }

  render() {
    var content;
    if (this.state.tasks_loading) {
      content = <span>Tasks are currently loading...</span>;
    } else if (this.state.error !== false) {
      console.log(this.state.error)
      content = <span>Tasks loading failed...</span>;
    } else {
      content = <TaskTable data={this.state.items} title={'Discovered Tasks'}/>;
    }

    return (
      <Panel>
        <Panel.Heading>
          <Panel.Title componentClass="h3">
            All Tasks List
          </Panel.Title>
        </Panel.Heading>
        <Panel.Body>
          {content}
        </Panel.Body>
      </Panel>
    )
  }
}

class WorkerListPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {workers_loading: true, items: null, error: false};
  }

  fetchTaskData() {
    fetch('/workers')
      .then(res => res.json())
      .then(
        (result) => {
          this.setState({
            workers_loading: false,
            items: result
          });
        },
        (error) => {
          this.setState({
            workers_loading: false,
            error: error
          });
        }
      )
  }

  componentDidMount() {
    this.setState({workers_loading: true});
    this.fetchTaskData();
  }

  render() {
    var content;
    if (this.state.workers_loading) {
      content = <span>Workers are currently loading...</span>;
    } else if (this.state.error !== false) {
      console.log(this.state.error)
      content = <span>Workers loading failed...</span>;
    } else {
      content = (
        <WorkerTable
          data={this.state.items}
          title={'Workers'}/>
      );
    }

    return (
      <Panel>
        <Panel.Heading>
          <Panel.Title componentClass="h3">
            Workers List
          </Panel.Title>
        </Panel.Heading>
        <Panel.Body>
          {content}
        </Panel.Body>
      </Panel>
    )
  }
}

class DemoTaskPanel extends React.Component {
  _socket = null;

  constructor(props) {
    super(props);
    this.state = {
      run_id: null,
      task_loading: true,
      error: false,
      volume: 0,
      worker_data: {},
      workers: [],
      active_worker: 0,
      connected: false,
    };
  }

  componentDidMount() {
    this.startTask();
    this.connectSocket();
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.state.active_worker != prevState.active_worker) {
      $('div#message-pane-segment').animate({
        scrollTop: $('div#message-pane-segment').get(0).scrollHeight
      }, 500);
      $("input#id_text_input").focus();
    }
  }

  _handleMessage(evt) {
    let msg = JSON.parse(evt.data);
    if (msg.command == 'sync') {
      this.handleNewData(msg);
    }
  }

  connectSocket() {
    if (this._socket) {
      return;
    }
    var url = window.location;
    var ws_protocol = null;
    if (url.protocol == "https:") {
      ws_protocol = 'wss';
    } else {
      ws_protocol = 'ws';
    }

    var socket = new WebSocket(ws_protocol + '://' + url.host + '/socket');

    socket.onmessage = (evt) => this._handleMessage(evt);

    socket.onopen = () => {
      this.setState({connected: true});
    };

    socket.onerror = socket.onclose = () => {
      this.setState({connected: false}, function () {
        this._socket = null;
      });
    };

    this._socket = socket;
  }

  startTask() {
    // Send a launch task request to the server, unpack the resulting
    // task config and pull the custom frontend for the task.
    this.setState({submitting: true});
    postData('/run_task/' + this.props.task_id)
      .then(res => res.json())
      .then(
        (result) => {
          this.handleNewData(result);
          import(
            /* webpackMode: "eager" */
            `./task_components/${this.props.task_id}/components/custom.jsx`
          ).then((custom) => {
            setCustomComponents(custom.default);
            if (result.task_config.frame_height === undefined) {
              result.task_config.frame_height = 650;
            }
            this.setState({
              task_loading: false, task_config: result.task_config});
          }).catch((err) => {
            // Custom react module not found
            if (result.task_config.frame_height === undefined) {
              result.task_config.frame_height = 650;
            }
            this.setState({
              task_loading: false, task_config: result.task_config});
          });
        },
        (error) => {
          this.setState({
            task_loading: false,
            error: error,
          });
          console.log(error);
          window.alert('Starting demo task failed. Error logged to console');
        }
      );
  }

  handleNewData(result) {
    // Unpack data from an array of the return value of
    // MockTurkAgent.get_update_packet()
    let worker_names = result.data.map((w) => w.worker_id);
    let curr_worker_data = this.state.worker_data;
    result.data.map((w) => {
      if (curr_worker_data[w.worker_id] === undefined) {
        curr_worker_data[w.worker_id] = {
          task_done: false,
          done_text: null,
          chat_state: 'waiting',
          messages: [],
          agent_id: null,
          context: {},
          world_state: null,
          worker_id: w.worker_id,
        };
      }
      let chat_state = 'waiting';
      if (w.task_done) {
        chat_state = 'done';
      } else if (w.wants_message) {
        chat_state = 'text_input';
      }
      let curr_worker = curr_worker_data[w.worker_id];
      curr_worker.messages = curr_worker.messages.concat(w.new_messages);
      curr_worker.task_done = w.task_done;
      curr_worker.done_text = w.done_text;
      curr_worker.world_state = w.status;
      curr_worker.chat_state = chat_state;
      curr_worker.agent_id = w.agent_id;
      if (w.all_messages.length > curr_worker.messages.length) {
        // If somehow the messages got out of sync, just grab the full message
        // list. This isn't great to do all the time (as then messages would
        // need to wait to be recieved by the server before we could even
        // display them. This also solves eventual 'refresh' issues)
        curr_worker.messages = w.all_messages;
      }
    });
    this.setState({workers: worker_names, worker_data: curr_worker_data})
  }

  sendMessage(message, data, callback, worker) {
    let msg = JSON.stringify(
      {'text': message, 'data': data,
       'sender': worker.worker_id, 'id': worker.agent_id});
    this._socket.send(msg);
    worker.messages.push({
      id: worker.agent_id,
      text: message,
      data: data,
      message_id: (new Date()).getTime(),
      is_review: false,
    });
    worker.wants_message = false;
    worker.chat_state = 'waiting';
    this.setState({worker_data: this.state.worker_data});
    callback();
  }

  renderSingleTaskPanel(worker_id) {
    let worker = this.state.worker_data[worker_id];
    let task_config = this.state.task_config;
    return (
      <div style={{height: task_config.frame_height}}>
        <BaseFrontend
          task_done={worker.task_done}
          done_text={worker.done_text}
          chat_state={worker.chat_state}
          onMessageSend={(m, d, c) => this.sendMessage(m, d, c, worker)}
          socket_status={'connected'}
          messages={worker.messages}
          agent_id={worker.agent_id}
          task_description={task_config.task_description}
          initialization_status={'done'}
          is_cover_page={false}
          frame_height={task_config.frame_height}
          context={worker.context}
          world_state={worker.world_state}
          v_id={worker.agent_id}
          allDoneCallback={() => console.log('all done called')}
          volume={this.state.volume}
          onVolumeChange={(v) => this.setState({volume: v})}
        />
      </div>
    );
  }

  renderTaskPanel() {
    let nav_items = this.state.workers.map((agent_id, idx) => {
      return (
        <NavItem
          eventKey={idx}
          key={agent_id + '-selector'}
          title={'View as ' + agent_id}>
          {agent_id}
        </NavItem>
      )
    });
    let task_panels = this.state.workers.map((agent_id, idx) => {
      let display = null;
      if (idx != this.state.active_worker) {
        display = {display: 'none'}
      }
      return (
        <div style={display} key={agent_id + '-task-display'}>
          {this.renderSingleTaskPanel(this.state.workers[idx])}
        </div>
      )
    });
    // Active panel must be first in the array for jquery to target properly
    let front_panel = task_panels.splice(this.state.active_worker, 1)
    task_panels.unshift(front_panel);
    return (
      <div>
        <Nav
          bsStyle="tabs"
          justified
          activeKey={this.state.active_worker}
          onSelect={key => this.setState({active_worker: key})}
        >
          {nav_items}
        </Nav>
        {task_panels}
      </div>
    );
  }

  render() {
    var content;
    if (this.state.task_loading) {
      content = <span>Task data is currently loading...</span>;
    } else if (this.state.error !== false) {
      console.log(this.state.error)
      content = <span>Task loading failed...</span>;
    } else {
      content = this.renderTaskPanel();
    }

    return (
      <Panel>
        <Panel.Heading>
          <Panel.Title componentClass="h3">
            Demo task for {this.props.task_id}
          </Panel.Title>
        </Panel.Heading>
        <Panel.Body>
          {content}
        </Panel.Body>
      </Panel>
    )
  }
}

class MainApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = resolveState(URL_DESTINATION);
  }

  renderInitPage() {
    return (
      <div>
        <span>Welcome to the ParlAI-Dashboard. Use the button to begin</span>
        <Button
          bsStyle="info"
          href="/app/home">
            Click me
        </Button>
      </div>
    );
  }

  renderUnsupportedPage() {
    return (
      <div>
        <span>Oops something happened! use this button to return </span>
        <Button
          bsStyle="info"
          href="/app/home">
            Click me
        </Button>
      </div>
    );
  }

  renderTaskPage() {
    // View should show runs of this task and datasets related to it. Should
    // also have a demo of the task at the bottom
    let run_task_list = null;
    return (
      <div style={{width: '100%'}}>
        {run_task_list}
        <DemoTaskPanel task_id = {this.state.args[0]} />
      </div>
    )
  }

  renderHomePage() {
    return (
      <div style={{width: '900px'}}>
        <RunListPanel/>
        <WorkerListPanel/>
        <TaskListPanel />
      </div>
    );
  }

  renderWorkerPage() {
    return (
      <div style={{width: '900px'}}>
        <WorkerPanel worker_id={this.state.args[0]}/>
      </div>
    );
  }

  renderAssignmentPage() {
    return (
      <div>
        <AssignmentPanel assignment_id={this.state.args[0]}/>
      </div>
    );
  }

  renderRunPage() {
    return (
      <div style={{width: '900px'}}>
        <RunPanel run_id={this.state.args[0]}/>
      </div>
    );
  }

  render() {
    if (this.state.url_state == AppURLStates.init) {
      return this.renderInitPage();
    } else if (this.state.url_state == AppURLStates.home) {
      return this.renderHomePage();
    } else if (this.state.url_state == AppURLStates.runs) {
      return this.renderRunPage();
    } else if (this.state.url_state == AppURLStates.assignments) {
      return this.renderAssignmentPage();
    } else if (this.state.url_state == AppURLStates.workers) {
      return this.renderWorkerPage();
    } else if (this.state.url_state == AppURLStates.tasks) {
      return this.renderTaskPage();
    } else {
      return this.renderUnsupportedPage();
    }
  }
}


var main_app = <MainApp/>;

ReactDOM.render(main_app, document.getElementById('app'));
