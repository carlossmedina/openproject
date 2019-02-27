// -- copyright
// OpenProject is a project management system.
// Copyright (C) 2012-2015 the OpenProject Foundation (OPF)
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License version 3.
//
// OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
// Copyright (C) 2006-2013 Jean-Philippe Lang
// Copyright (C) 2010-2013 the ChiliProject Team
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
//
// See doc/COPYRIGHT.rdoc for more details.
// ++

import {Injectable} from '@angular/core';
import {QueryResource, TimelineLabels, TimelineZoomLevel} from 'core-app/modules/hal/resources/query-resource';
import {WorkPackageResource} from 'core-app/modules/hal/resources/work-package-resource';
import {IsolatedQuerySpace} from "core-app/modules/work_packages/query-space/isolated-query-space";
import {InputState} from 'reactivestates';
import {zoomLevelOrder} from '../../wp-table/timeline/wp-timeline';
import {WorkPackageTableTimelineState} from './../wp-table-timeline';
import {WorkPackageQueryStateService, WorkPackageTableBaseService} from './wp-table-base.service';

@Injectable()
export class WorkPackageTableTimelineService extends WorkPackageQueryStateService<WorkPackageTableTimelineState> {

  public constructor(protected readonly querySpace:IsolatedQuerySpace) {
    super(querySpace);
  }

  public get state():InputState<WorkPackageTableTimelineState> {
    return this.querySpace.timeline;
  }

  public valueFromQuery(query:QueryResource) {
    return {
      ...this.defaultState,
      visible: query.timelineVisible,
      zoomLevel: query.timelineZoomLevel,
      labels: query.timelineLabels
    };
  }

  public hasChanged(query:QueryResource) {
    const visibilityChanged = this.isVisible !== query.timelineVisible;
    const zoomLevelChanged = this.zoomLevel !== query.timelineZoomLevel;
    const labelsChanged = !_.isEqual(this.current.labels, query.timelineLabels);

    return visibilityChanged || zoomLevelChanged || labelsChanged;
  }

  public applyToQuery(query:QueryResource) {
    query.timelineVisible = this.isVisible;
    query.timelineZoomLevel = this.zoomLevel;
    query.timelineLabels = this.current.labels;

    return false;
  }

  public toggle() {
    let currentState = this.current;
    this.setVisible(!currentState.visible);
  }

  public setVisible(value:boolean) {
    this.state.putValue({...this.current, visible: value});
  }

  public get isVisible() {
    return this.current.visible;
  }

  public get zoomLevel() {
    return this.current.zoomLevel;
  }

  public get labels() {
    if (_.isEmpty(this.current.labels)) {
      return this.defaultLabels;
    }

    return this.current.labels;
  }

  public updateLabels(labels:TimelineLabels) {
    this.modify({ labels: labels });
  }

  public getNormalizedLabels(workPackage:WorkPackageResource) {
    let labels:TimelineLabels = this.defaultLabels;

    _.each(this.current.labels, (attribute:string | null, positionAsString:string) => {
      // RR: Lodash typings declare the position as string. However, it is save to cast
      // to `keyof TimelineLabels` because `this.current.labels` is of type TimelineLabels.
      const position:keyof TimelineLabels = positionAsString as keyof TimelineLabels;

      // Set to null to explicitly disable
      if (attribute === '') {
        labels[position] = null;
      } else {
        labels[position] = attribute;
      }
    });

    return labels;
  }

  public setZoomLevel(level:TimelineZoomLevel) {
    this.modify({ zoomLevel: level });
  }

  public updateZoomWithDelta(delta:number) {
    if (this.isAutoZoomEnabled()) {
      this.toggleAutoZoom();
    }

    let idx = zoomLevelOrder.indexOf(this.current.zoomLevel);
    idx += delta;

    if (idx >= 0 && idx < zoomLevelOrder.length) {
      this.setZoomLevel(zoomLevelOrder[idx]);
    }
  }

  public toggleAutoZoom(value = !this.current.autoZoom) {
    this.modify({ autoZoom: value });
  }

  public isAutoZoomEnabled():boolean {
    return this.current.autoZoom;
  }

  public get current():WorkPackageTableTimelineState {
    return this.state.getValueOr(this.defaultState);
  }

  /**
   * Modify the state, updating with parts of properties
   * @param update
   */
  private modify(update:Partial<WorkPackageTableTimelineState>) {
    this.update({ ...this.current, ...update });
  }

  private get defaultLabels():TimelineLabels {
    return {
      left: '',
      right: '',
      farRight: 'subject'
    };
  }

  private get defaultState():WorkPackageTableTimelineState {
    return {
      autoZoom: true,
      zoomLevel: 'days',
      visible: false,
      labels: this.defaultLabels
    };
  }
}
